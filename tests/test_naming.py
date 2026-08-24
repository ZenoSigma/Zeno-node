import unittest
import os
from datetime import datetime
from nodes.advanced_save_image import (
    auto_detect_model_name,
    auto_detect_image_name,
    sanitize_model_name,
    sanitize_image_name,
    sanitize_filename_component,
    normalize_filename_case,
    AdvancedSaveImage,
    DELIMITER
)

class TestNamingAndSanitization(unittest.TestCase):
    def setUp(self):
        self.node = AdvancedSaveImage()

    def test_sanitize_model_name(self):
        raw = "SDXL/RealVisXL_V4.0_Lightning.safetensors"
        cleaned = sanitize_model_name(raw)
        self.assertEqual(cleaned, "RealVisXL_V_Lightning")

    def test_sanitize_image_name(self):
        # 1. Strips path and extension, keeps digits, fits within 12 chars
        raw1 = "C:\\Users\\user\\Pictures\\portrait_01.png"
        self.assertEqual(sanitize_image_name(raw1), "portrait_01")

        # 2. Handles special characters and truncates to 12 chars
        raw2 = "subfolder/my photo (ver 2) [final].jpg"
        self.assertEqual(sanitize_image_name(raw2), "my_photo_ver")

        # 3. Truncates long names to 12 chars and strips trailing delimiter
        raw3 = "render_character---03__alt.WEBP"
        self.assertEqual(sanitize_image_name(raw3), "render_chara")

        # 4. Strips dangling trailing delimiter when sliced at delimiter boundary
        raw4 = "concept_art_v2.png" # 12 chars without extension is "concept_art_" -> strips to "concept_art"
        self.assertEqual(sanitize_image_name(raw4), "concept_art")

        # 5. Empty and None
        self.assertEqual(sanitize_image_name(""), "")
        self.assertEqual(sanitize_image_name(None), "")

    def test_normalize_filename_case(self):
        self.assertEqual(normalize_filename_case("REALVISXL_PORTRAIT"), "Realvisxl_portrait")
        self.assertEqual(normalize_filename_case("abc_DEF"), "Abc_def")

    def test_auto_detect_image_name_direct(self):
        prompt = {
            "1": {
                "class_type": "LoadImage",
                "inputs": {"image": "source_character_01.png"}
            },
            "2": {
                "class_type": "AdvancedSaveImage",
                "inputs": {"images": ["1", 0]}
            }
        }
        detected = auto_detect_image_name(prompt, unique_id="2")
        self.assertEqual(detected, "source_character_01.png")

    def test_auto_detect_image_name_upstream_graph_traversal(self):
        # Multi-hop pipeline: LoadImage -> VAEEncode -> KSampler -> VAEDecode -> AdvancedSaveImage
        prompt = {
            "10": {
                "class_type": "LoadImage",
                "inputs": {"image": "photos/model_pose_02.jpg"}
            },
            "20": {
                "class_type": "VAEEncode",
                "inputs": {"pixels": ["10", 0], "vae": ["30", 0]}
            },
            "25": {
                "class_type": "KSampler",
                "inputs": {"latent_image": ["20", 0], "model": ["30", 0]}
            },
            "26": {
                "class_type": "VAEDecode",
                "inputs": {"samples": ["25", 0], "vae": ["30", 0]}
            },
            "30": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {"ckpt_name": "SDXL/RealVisXL_v4.0.safetensors"}
            },
            "40": {
                "class_type": "AdvancedSaveImage",
                "inputs": {"images": ["26", 0]}
            }
        }
        detected_img = auto_detect_image_name(prompt, unique_id="40")
        self.assertEqual(detected_img, "photos/model_pose_02.jpg")

        detected_model = auto_detect_model_name(prompt)
        self.assertEqual(detected_model, "SDXL/RealVisXL_v4.0.safetensors")

    def test_full_prefix_pipeline_with_image_name_priority(self):
        mock_prompt = {
            "1": {
                "class_type": "LoadImage",
                "inputs": {"image": "character_face_01.png"}
            },
            "4": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {"ckpt_name": "SDXL\\RealVisXL_v4.0.safetensors"}
            },
            "5": {
                "class_type": "AdvancedSaveImage",
                "inputs": {"images": ["1", 0]}
            }
        }

        # 1. Both image name and model name enabled -> 12-char image name prioritized BEFORE model name
        prefix_both = self.node.build_filename_prefix(
            include_model_name=True,
            include_timestamp=True,
            timestamp_format="%Y%m%d",
            custom_text="portrait photo",
            prompt=mock_prompt,
            include_image_name=True,
            unique_id="5"
        )
        today = datetime.now().strftime("%Y%m%d")
        expected_both = f"Character_fa_realvisxl_v_{today}_portrait_photo"
        self.assertEqual(prefix_both, expected_both)

        # 2. Only image name enabled (model name disabled)
        prefix_img_only = self.node.build_filename_prefix(
            include_model_name=False,
            include_timestamp=True,
            timestamp_format="%Y%m%d",
            custom_text="portrait photo",
            prompt=mock_prompt,
            include_image_name=True,
            unique_id="5"
        )
        expected_img_only = f"Character_fa_{today}_portrait_photo"
        self.assertEqual(prefix_img_only, expected_img_only)

        # 3. Only model name enabled (include_image_name=False)
        prefix_model_only = self.node.build_filename_prefix(
            include_model_name=True,
            include_timestamp=True,
            timestamp_format="%Y%m%d",
            custom_text="portrait photo",
            prompt=mock_prompt,
            include_image_name=False,
            unique_id="5"
        )
        expected_model_only = f"Realvisxl_v_{today}_portrait_photo"
        self.assertEqual(prefix_model_only, expected_model_only)

    def test_subfolder_by_input_image_name(self):
        mock_prompt = {
            "1": {
                "class_type": "LoadImage",
                "inputs": {"image": "concept_art_v2.png"}
            },
            "2": {
                "class_type": "AdvancedSaveImage",
                "inputs": {"images": ["1", 0]}
            }
        }
        subfolder = self.node.resolve_subfolder("By Input Image Name", "", prompt=mock_prompt, unique_id="2")
        self.assertEqual(subfolder, "Concept_art")

if __name__ == "__main__":
    unittest.main()
