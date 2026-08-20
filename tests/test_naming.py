import unittest
from datetime import datetime
import re
import os

DELIMITER = "_"

def auto_detect_model_name(prompt: dict) -> str:
    if not prompt or not isinstance(prompt, dict):
        return ""

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

    for node_id, node_data in prompt.items():
        if isinstance(node_data, dict):
            inputs = node_data.get("inputs", {})
            for key in ckpt_keys:
                val = inputs.get(key)
                if isinstance(val, str) and val.strip():
                    return val

    return ""

def sanitize_model_name(text: str, delimiter: str = DELIMITER) -> str:
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
    if not text:
        return ""
    text = re.sub(r"[^a-zA-Z0-9_\-\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = text.replace(" ", delimiter)
    return text

def normalize_filename_case(text: str) -> str:
    if not text:
        return ""
    lower_text = text.lower()
    return lower_text[:1].upper() + lower_text[1:]

def build_filename_prefix(
    include_model_name: bool,
    include_timestamp: bool,
    timestamp_format: str,
    custom_text: str,
    prompt: dict = None
) -> str:
    parts = []
    if include_model_name and prompt is not None:
        detected_model = auto_detect_model_name(prompt)
        clean_model = sanitize_model_name(detected_model, delimiter=DELIMITER)
        if clean_model:
            parts.append(clean_model)
    if include_timestamp:
        try:
            ts_str = datetime.now().strftime(timestamp_format)
        except Exception:
            ts_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        clean_ts = sanitize_filename_component(ts_str, delimiter=DELIMITER)
        if clean_ts:
            parts.append(clean_ts)
    clean_custom = sanitize_filename_component(custom_text, delimiter=DELIMITER)
    if clean_custom:
        parts.append(clean_custom)
    if not parts:
        return "Comfyui"
    raw_prefix = DELIMITER.join(parts)
    escaped_del = re.escape(DELIMITER)
    cleaned_prefix = re.sub(f"{escaped_del}+", DELIMITER, raw_prefix).strip(DELIMITER)
    if not cleaned_prefix:
        return "Comfyui"
    return normalize_filename_case(cleaned_prefix)

class TestNamingAndSanitization(unittest.TestCase):
    def test_sanitize_model_name(self):
        raw = "SDXL/RealVisXL_V4.0_Lightning.safetensors"
        cleaned = sanitize_model_name(raw)
        self.assertEqual(cleaned, "RealVisXL_V_Lightning")

    def test_normalize_filename_case(self):
        self.assertEqual(normalize_filename_case("REALVISXL_PORTRAIT"), "Realvisxl_portrait")
        self.assertEqual(normalize_filename_case("abc_DEF"), "Abc_def")

    def test_full_prefix_pipeline(self):
        mock_prompt = {
            "4": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {"ckpt_name": "SDXL\\RealVisXL_v4.0.safetensors"}
            }
        }
        prefix = build_filename_prefix(
            include_model_name=True,
            include_timestamp=True,
            timestamp_format="%Y%m%d",
            custom_text="portrait photo",
            prompt=mock_prompt
        )
        today = datetime.now().strftime("%Y%m%d")
        expected = f"Realvisxl_v_{today}_portrait_photo"
        self.assertEqual(prefix, expected)

if __name__ == "__main__":
    unittest.main()
