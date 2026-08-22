import torch
import torch.nn.functional as F

try:
    import comfy.model_management
except ImportError:
    class _MockModelManagement:
        @staticmethod
        def intermediate_device():
            return "cpu"

        @staticmethod
        def intermediate_dtype():
            return torch.float32

    class _MockComfy:
        model_management = _MockModelManagement()

    comfy = _MockComfy()


class RatioLatentGenerator:
    DESCRIPTION = "Generates an Empty Latent with standardized aspect ratio dimensions (multiples of 32), with optional automatic image and mask scaling/cropping."

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "longest_side": ("INT", {
                    "default": 1024,
                    "min": 1024,
                    "max": 4000,
                    "step": 32,
                    "tooltip": "Longest dimension size (automatically rounded to a multiple of 32)."
                }),
                "aspect_ratio": (
                    ["1:1", "5:4", "4:3", "3:2", "16:9", "21:9", "2.35:1"],
                    {"tooltip": "Target aspect ratio (e.g. 1:1, 16:9, 3:2...)."
                }),
                "swap_dimensions": ("BOOLEAN", {
                    "default": False,
                    "tooltip": "Swap width and height to toggle between Landscape and Portrait."
                }),
                "batch_size": ("INT", {
                    "default": 1,
                    "min": 1,
                    "max": 64,
                    "step": 1,
                    "tooltip": "Number of latent samples generated in a single batch."
                }),
                "crop_mode": (
                    ["letterbox", "crop", "stretch"],
                    {"tooltip": "Processing mode for input image/mask: letterbox (pad borders), crop (center crop), stretch (scale to fit)."
                }),
                "method": (
                    ["bicubic", "bilinear", "nearest", "area"],
                    {"tooltip": "Interpolation algorithm for resizing (bicubic, bilinear, nearest, area)."
                }),
            },
            "optional": {
                "image": ("IMAGE", {"tooltip": "Optional input image. Automatically resized/cropped to match target aspect ratio and dimensions."}),
                "mask": ("MASK", {"tooltip": "Optional input mask. Automatically resized/cropped to match target aspect ratio and dimensions."}),
            }
        }

    RETURN_TYPES = ("INT", "INT", "LATENT", "IMAGE", "MASK")
    RETURN_NAMES = ("WIDTH", "HEIGHT", "EMPTY_LATENT", "IMAGE", "MASK")
    OUTPUT_TOOLTIPS = (
        "Width (multiple of 32)",
        "Height (multiple of 32)",
        "Empty Latent Tensor",
        "Transformed Image",
        "Transformed Mask"
    )
    FUNCTION = "generate"
    CATEGORY = "Zeno/Latent"

    def generate(self, longest_side, aspect_ratio, swap_dimensions, batch_size, crop_mode, method, image=None, mask=None):
        # 1. Determine Ratio and Batch Size
        if image is not None:
            _, orig_h, orig_w, _ = image.shape
            w_ratio = float(orig_w)
            h_ratio = float(orig_h)
            output_batch = image.shape[0]
        elif mask is not None:
            if mask.ndim == 2:
                orig_h, orig_w = mask.shape
                output_batch = 1
            else:
                orig_h, orig_w = mask.shape[1], mask.shape[2]
                output_batch = mask.shape[0]
            w_ratio = float(orig_w)
            h_ratio = float(orig_h)
        else:
            w_str, h_str = aspect_ratio.split(":")
            w_ratio = float(w_str)
            h_ratio = float(h_str)
            if swap_dimensions:
                w_ratio, h_ratio = h_ratio, w_ratio
            output_batch = batch_size

        # 2. Round longest dimension to multiple of 32
        optimal_longest = round(longest_side / 32) * 32
        optimal_longest = min(4000, max(1024, optimal_longest))

        # 3. Calculate complementary dimension
        if w_ratio >= h_ratio:
            width = optimal_longest
            raw_height = (width * h_ratio) / w_ratio
            height = round(raw_height / 32) * 32
        else:
            height = optimal_longest
            raw_width = (height * w_ratio) / h_ratio
            width = round(raw_width / 32) * 32
            
        width = max(256, width)
        height = max(256, height)

        # 4. Generate Empty Latent
        device = comfy.model_management.intermediate_device()
        latent = torch.zeros(
            [output_batch, 4, height // 8, width // 8],
            device=device,
            dtype=comfy.model_management.intermediate_dtype(),
        )

        # Helper function to transform tensor BCHW (Stretch / Crop / Letterbox)
        def transform_tensor(tensor_bchw, target_h, target_w, pad_val=0.0):
            _, _, cur_h, cur_w = tensor_bchw.shape

            def resize_op(t, size):
                if method in ["bicubic", "bilinear"]:
                    return F.interpolate(t, size=size, mode=method, align_corners=False)
                else:
                    return F.interpolate(t, size=size, mode=method)

            if crop_mode in ["stretch", "fill"]:
                return resize_op(tensor_bchw, (target_h, target_w))

            elif crop_mode == "crop":
                scale_factor = max(target_w / cur_w, target_h / cur_h)
                interp_w = int(round(cur_w * scale_factor))
                interp_h = int(round(cur_h * scale_factor))
                
                resized = resize_op(tensor_bchw, (interp_h, interp_w))
                
                start_y = max(0, (interp_h - target_h) // 2)
                start_x = max(0, (interp_w - target_w) // 2)
                return resized[:, :, start_y:start_y+target_h, start_x:start_x+target_w]

            elif crop_mode == "letterbox":
                scale_factor = min(target_w / cur_w, target_h / cur_h)
                interp_w = int(round(cur_w * scale_factor))
                interp_h = int(round(cur_h * scale_factor))
                
                resized = resize_op(tensor_bchw, (interp_h, interp_w))
                
                pad_y = max(0, target_h - interp_h)
                pad_x = max(0, target_w - interp_w)
                pad_left = pad_x // 2
                pad_right = pad_x - pad_left
                pad_top = pad_y // 2
                pad_bottom = pad_y - pad_top
                return F.pad(resized, (pad_left, pad_right, pad_top, pad_bottom), mode="constant", value=pad_val)

            return tensor_bchw

        # 5. Process Image Transform (if image provided)
        if image is not None:
            # ComfyUI Image Tensor shape: [B, H, W, C] -> PyTorch BCHW: [B, C, H, W]
            img = image.permute(0, 3, 1, 2)
            img = transform_tensor(img, height, width, pad_val=0.0)
            out_image = img.permute(0, 2, 3, 1)
        else:
            out_image = torch.zeros([output_batch, height, width, 3])

        # 6. Process Mask Transform (if mask provided)
        if mask is not None:
            # ComfyUI Mask Tensor shape: [B, H, W] or [H, W] -> PyTorch BCHW: [B, 1, H, W]
            if mask.ndim == 2:
                m = mask.unsqueeze(0).unsqueeze(0)
            elif mask.ndim == 3:
                m = mask.unsqueeze(1)
            else:
                m = mask
            
            m = transform_tensor(m, height, width, pad_val=0.0)
            # Return standard ComfyUI MASK shape: [B, H, W]
            out_mask = m.squeeze(1)
        else:
            out_mask = torch.zeros([output_batch, height, width])

        # 7. Latent Metadata
        empty_latent = {
            "samples": latent,
            "downscale_ratio_spacial": 8,
        }

        return (width, height, empty_latent, out_image, out_mask)
