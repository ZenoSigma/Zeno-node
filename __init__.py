from .nodes.advanced_save_image import AdvancedSaveImage
from .nodes.ratio_latent_node import RatioLatentGenerator
from .nodes.prompt_library_node import PromptLibrary

NODE_CLASS_MAPPINGS = {
    "AdvancedSaveImage": AdvancedSaveImage,
    "RatioLatentGenerator": RatioLatentGenerator,
    "PromptLibrary": PromptLibrary,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "AdvancedSaveImage": "Zeno - Advanced Save Image",
    "RatioLatentGenerator": "Zeno - Smart Ratio Latent Generator",
    "PromptLibrary": "Zeno - Prompt Library",
}

WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
