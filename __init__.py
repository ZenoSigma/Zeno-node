from .nodes.advanced_save_image import AdvancedSaveImage
from .nodes.ratio_latent_node import RatioLatentGenerator

NODE_CLASS_MAPPINGS = {
    "AdvancedSaveImage": AdvancedSaveImage,
    "RatioLatentGenerator": RatioLatentGenerator,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "AdvancedSaveImage": "Zeno - Advanced Save Image",
    "RatioLatentGenerator": "Zeno - Smart Ratio Latent Generator",
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
