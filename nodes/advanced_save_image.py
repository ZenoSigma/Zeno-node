import os
import re
import sys
import json
import numpy as np
from datetime import datetime
from PIL import Image
from PIL.PngImagePlugin import PngInfo

import folder_paths
import comfy.cli_args


DELIMITER = "_"


def play_alert_sound():
    """Phát âm thanh chuông thông báo khi hoàn thành xuất ảnh."""
    try:
        if sys.platform == "win32":
            import winsound
            winsound.MessageBeep(winsound.MB_ICONASTERISK)
        else:
            sys.stdout.write("\a")
            sys.stdout.flush()
    except Exception:
        pass


def auto_detect_model_name(prompt: dict) -> str:
    """
    Tự động truy vết và trích xuất tên Checkpoint/Model từ đồ thị thực thi ComfyUI (prompt dict).
    Hỗ trợ cả node CheckpointLoader tiêu chuẩn và Zeno Multi Checkpoint Switch (động theo slot ON).
    """
    if not prompt or not isinstance(prompt, dict):
        return ""

    # 1. Kiểm tra node CheckpointSwitch (quét toàn bộ các slot động đang bật ON)
    for node_id, node_data in prompt.items():
        if isinstance(node_data, dict):
            class_type = node_data.get("class_type", "")
            inputs = node_data.get("inputs", {})
            if class_type in ["CheckpointSwitch", "MultiCheckpointLoader", "ZenoCheckpointSwitch"]:
                for k, v in inputs.items():
                    if k.startswith("enable_") and v is True:
                        try:
                            idx_str = k.split("_")[1]
                            mod = inputs.get(f"model_{idx_str}")
                            if mod and mod != "None":
                                return mod
                        except Exception:
                            pass
                for k, v in inputs.items():
                    if k.startswith("model_") and v and v != "None":
                        return v

    # 2. Tìm trong các node class loader chuyên dụng tiêu chuẩn
    ckpt_keys = ["ckpt_name", "unet_name", "model_name", "checkpoint", "ckpt_filename"]
    target_classes = [
        "CheckpointLoaderSimple",
        "CheckpointLoader",
        "UNETLoader",
        "DiffusionModelLoader",
        "DualCLIPLoader",
        "ImageOnlyCheckpointLoader",
        "unCLIPCheckpointLoader"
    ]

    for node_id, node_data in prompt.items():
        if isinstance(node_data, dict):
            class_type = node_data.get("class_type", "")
            inputs = node_data.get("inputs", {})
            if class_type in target_classes:
                for key in ckpt_keys:
                    val = inputs.get(key)
                    if isinstance(val, str) and val.strip():
                        return val

    # 3. Tìm trong bất kỳ node nào có input chứa ckpt_name / unet_name
    for node_id, node_data in prompt.items():
        if isinstance(node_data, dict):
            inputs = node_data.get("inputs", {})
            for key in ckpt_keys:
                val = inputs.get(key)
                if isinstance(val, str) and val.strip():
                    return val

    return ""


def sanitize_model_name(text: str, delimiter: str = DELIMITER) -> str:
    """
    Chuẩn hoá riêng cho tên Model:
    - Loại bỏ đường dẫn thư mục nếu có (ví dụ 'SDXL/model.safetensors' -> 'model')
    - Loại bỏ đuôi extension (.safetensors, .ckpt, .pt, .bin).
    - Loại bỏ toàn bộ chữ số (0-9), chỉ giữ lại phần text.
    - Loại bỏ ký tự đặc biệt, dọn dẹp các dấu gạch/khoảng trắng thừa.
    """
    if not text:
        return ""
    text = os.path.basename(text)
    text = re.sub(r"\.(safetensors|ckpt|pt|bin)$", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\d+", "", text)
    text = re.sub(r"[^a-zA-Z_\-\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = text.replace(" ", delimiter)
    text = re.sub(r"[_\-]{2,}", delimiter, text).strip("_- ")
    return text


def sanitize_filename_component(text: str, delimiter: str = DELIMITER) -> str:
    """
    Loại bỏ ký tự đặc biệt cho các thành phần thông thường (Timestamp, Custom text).
    Giữ lại chữ cái, chữ số, gạch dưới và gạch ngang.
    """
    if not text:
        return ""
    text = re.sub(r"[^a-zA-Z0-9_\-\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = text.replace(" ", delimiter)
    return text


def normalize_filename_case(text: str) -> str:
    """
    Chuẩn hoá chữ hoa/thường:
    Chỉ viết hoa chữ cái đầu tiên của toàn bộ tên file, tất cả các ký tự còn lại là chữ thường.
    """
    if not text:
        return ""
    lower_text = text.lower()
    return lower_text[:1].upper() + lower_text[1:]


class AdvancedSaveImage:
    def __init__(self):
        self.output_dir = folder_paths.get_output_directory()
        self.type = "output"
        self.prefix_append = ""

    DESCRIPTION = "Node lưu ảnh nâng cao tự động nhận diện tên Model/Checkpoint, định dạng timestamp, phân loại thư mục con và phát âm thanh khi hoàn thành."

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "images": ("IMAGE", {"tooltip": "Danh sách hình ảnh cần lưu và hiển thị preview trên node."}),
                # 1. Model name (ở đầu tên ảnh, 100% tự động nhận diện từ workflow)
                "include_model_name": ("BOOLEAN", {
                    "default": True,
                    "label_on": "Enable",
                    "label_off": "Disable",
                    "tooltip": "Tự động nhận diện và thêm tên Model/Checkpoint vào đầu tên file ảnh."
                }),
                # 2. Thời điểm tạo
                "include_timestamp": ("BOOLEAN", {
                    "default": True,
                    "label_on": "Enable",
                    "label_off": "Disable",
                    "tooltip": "Thêm mốc thời gian vào tên file ảnh theo định dạng được chọn."
                }),
                "timestamp_format": ([
                    "%Y%m%d_%H%M%S",       # e.g. 20260816_113000
                    "%Y-%m-%d_%H-%M-%S",   # e.g. 2026-08-16_11-30-00
                    "%Y%m%d",              # e.g. 20260816
                    "%H%M%S",              # e.g. 113000
                ], {
                    "default": "%Y%m%d_%H%M%S",
                    "tooltip": "Định dạng hiển thị thời gian trong tên file (VD: YYYYMMDD_HHMMSS)."
                }),
                # 3. Custom text do người dùng điền
                "custom_text": ("STRING", {
                    "default": "",
                    "multiline": False,
                    "placeholder": "Tên tuỳ chỉnh / Tag / Ghi chú...",
                    "tooltip": "Văn bản tùy chỉnh bổ sung vào tên file (VD: tên nhân vật, concept, tag)."
                }),
                # Cấu hình thư mục con
                "subfolder_mode": ([
                    "None",
                    "By Date (YYYY-MM-DD)",
                    "By Model Name",
                    "Custom Subfolder"
                ], {
                    "default": "None",
                    "tooltip": "Chế độ gom nhóm lưu ảnh vào thư mục con (theo ngày, theo tên model hoặc thư mục tùy chọn)."
                }),
                "custom_subfolder": ("STRING", {
                    "default": "",
                    "tooltip": "Tên thư mục con tùy chỉnh (chỉ có hiệu lực khi chọn 'Custom Subfolder')."
                }),
                "save_workflow_metadata": ("BOOLEAN", {
                    "default": True,
                    "label_on": "Yes",
                    "label_off": "No",
                    "tooltip": "Nhúng thông tin prompt và workflow vào metadata file PNG để có thể kéo thả nạp lại workflow sau này."
                }),
                # 4. Chuông thông báo khi lưu ảnh hoàn tất
                "play_sound_on_finish": ("BOOLEAN", {
                    "default": False,
                    "label_on": "Enable",
                    "label_off": "Disable",
                    "tooltip": "Phát chuông thông báo âm thanh khi toàn bộ batch ảnh đã được lưu xong."
                }),
            },
            "hidden": {
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO"
            },
        }

    RETURN_TYPES = ("IMAGE", "STRING")
    RETURN_NAMES = ("images", "file_paths")
    OUTPUT_TOOLTIPS = ("Danh sách ảnh đã lưu", "Đường dẫn tuyệt đối đến các file ảnh vừa lưu trên máy")
    FUNCTION = "save_images"
    OUTPUT_NODE = True
    CATEGORY = "Zeno/Image"

    @classmethod
    def VALIDATE_INPUTS(s, **kwargs):
        # Cho phép bỏ qua lỗi enum nếu load từ workflow cũ
        return True

    def build_filename_prefix(
        self,
        include_model_name: bool,
        include_timestamp: bool,
        timestamp_format: str,
        custom_text: str,
        prompt: dict = None
    ) -> str:
        parts = []

        # 1. Model Name (Tự động nhận diện)
        if include_model_name and prompt is not None:
            detected_model = auto_detect_model_name(prompt)
            clean_model = sanitize_model_name(detected_model, delimiter=DELIMITER)
            if clean_model:
                parts.append(clean_model)

        # 2. Timestamp
        if include_timestamp:
            try:
                ts_str = datetime.now().strftime(timestamp_format)
            except Exception:
                ts_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            clean_ts = sanitize_filename_component(ts_str, delimiter=DELIMITER)
            if clean_ts:
                parts.append(clean_ts)

        # 3. Custom Text
        clean_custom = sanitize_filename_component(custom_text, delimiter=DELIMITER)
        if clean_custom:
            parts.append(clean_custom)

        if not parts:
            return "Comfyui"

        raw_prefix = DELIMITER.join(parts)

        # Dọn dẹp delimiter lặp lại
        escaped_del = re.escape(DELIMITER)
        cleaned_prefix = re.sub(f"{escaped_del}+", DELIMITER, raw_prefix).strip(DELIMITER)

        if not cleaned_prefix:
            return "Comfyui"

        return normalize_filename_case(cleaned_prefix)

    def resolve_subfolder(self, subfolder_mode: str, custom_subfolder: str, prompt: dict = None) -> str:
        if subfolder_mode == "By Date (YYYY-MM-DD)":
            return datetime.now().strftime("%Y-%m-%d")
        elif subfolder_mode == "By Model Name":
            detected_model = auto_detect_model_name(prompt) if prompt is not None else ""
            clean_model = sanitize_model_name(detected_model, delimiter=DELIMITER)
            return normalize_filename_case(clean_model) if clean_model else "Default_model"
        elif subfolder_mode == "Custom Subfolder":
            if not isinstance(custom_subfolder, str) or custom_subfolder.strip().lower() in ["none", ""]:
                return ""
            clean_sub = custom_subfolder.strip().replace("\\", "/")
            clean_sub = re.sub(r'[^a-zA-Z0-9_\-/\s]', '', clean_sub)
            return clean_sub
        return ""

    def save_images(
        self,
        images,
        include_model_name=True,
        include_timestamp=True,
        timestamp_format="%Y%m%d_%H%M%S",
        custom_text="",
        subfolder_mode="None",
        custom_subfolder="",
        save_workflow_metadata=True,
        play_sound_on_finish=False,
        prompt=None,
        extra_pnginfo=None
    ):
        # 1. Tạo filename prefix chuẩn hoá
        filename_prefix = self.build_filename_prefix(
            include_model_name=include_model_name,
            include_timestamp=include_timestamp,
            timestamp_format=timestamp_format,
            custom_text=custom_text,
            prompt=prompt
        )

        # 2. Xử lý Subfolder (tự động fallback nếu subfolder_mode mang giá trị lạ từ workflow cũ)
        subfolder = self.resolve_subfolder(subfolder_mode, custom_subfolder, prompt=prompt)
        if subfolder:
            full_prefix = os.path.join(subfolder, filename_prefix)
        else:
            full_prefix = filename_prefix

        # 3. Lấy đường dẫn lưu file an toàn từ ComfyUI folder_paths
        full_output_folder, filename, counter, subfolder_res, filename_prefix_res = \
            folder_paths.get_save_image_path(full_prefix, self.output_dir, images[0].shape[1], images[0].shape[0])

        results = []
        saved_file_paths = []

        # 4. Lưu từng ảnh trong batch (mặc định định dạng PNG lossless chất lượng gốc)
        for idx, image in enumerate(images):
            i = 255. * image.cpu().numpy()
            img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))

            # Metadata Workflow
            metadata = None
            if save_workflow_metadata and not comfy.cli_args.args.disable_metadata:
                metadata = PngInfo()
                if prompt is not None:
                    metadata.add_text("prompt", json.dumps(prompt))
                if extra_pnginfo is not None:
                    for k, v in extra_pnginfo.items():
                        metadata.add_text(k, json.dumps(v))

            file_name = f"{filename}_{counter:05}_{idx:02}.png" if len(images) > 1 else f"{filename}_{counter:05}_.png"
            file_path = os.path.join(full_output_folder, file_name)

            img.save(file_path, pnginfo=metadata, compress_level=4)

            saved_file_paths.append(file_path)
            results.append({
                "filename": file_name,
                "subfolder": subfolder_res,
                "type": self.type
            })

            counter += 1

        if play_sound_on_finish:
            play_alert_sound()

        return {
            "ui": {"images": results},
            "result": (images, "\n".join(saved_file_paths))
        }
