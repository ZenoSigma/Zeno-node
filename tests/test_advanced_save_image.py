import unittest
import torch
from nodes.advanced_save_image import AdvancedSaveImage, play_alert_sound


class TestAdvancedSaveImage(unittest.TestCase):
    def setUp(self):
        self.node = AdvancedSaveImage()

    def test_input_types_sound_configuration(self):
        types = AdvancedSaveImage.INPUT_TYPES()
        self.assertIn("required", types)
        required = types["required"]

        # 1. Verify play_sound_on_finish is enabled by default
        self.assertIn("play_sound_on_finish", required)
        sound_flag = required["play_sound_on_finish"]
        self.assertEqual(sound_flag[0], "BOOLEAN")
        self.assertEqual(sound_flag[1].get("default"), True)

        # 2. Verify sound_choice widget
        self.assertIn("sound_choice", required)
        sound_choice = required["sound_choice"]
        self.assertIsInstance(sound_choice[0], list)
        self.assertIn("Chimes", sound_choice[0])
        self.assertIn("Ding", sound_choice[0])
        self.assertIn("Notify", sound_choice[0])
        self.assertIn("Tada", sound_choice[0])
        self.assertIn("Chord", sound_choice[0])
        self.assertIn("Speech On", sound_choice[0])
        self.assertIn("Ring", sound_choice[0])
        self.assertIn("Windows Default", sound_choice[0])
        self.assertIn("Synth Bell", sound_choice[0])
        self.assertEqual(sound_choice[1].get("default"), "Chimes")

    def test_play_alert_sound_all_options(self):
        sounds = [
            "Chimes",
            "Ding",
            "Notify",
            "Tada",
            "Chord",
            "Speech On",
            "Ring",
            "Windows Default",
            "Synth Bell",
            "Asterisk",
            "Exclamation",
            "NonExistentSound",
            None,
            ""
        ]
        for s in sounds:
            try:
                play_alert_sound(s)
            except Exception as e:
                self.fail(f"play_alert_sound('{s}') raised unexpected exception: {e}")


    def test_input_types_image_name_configuration(self):
        types = AdvancedSaveImage.INPUT_TYPES()
        self.assertIn("required", types)
        required = types["required"]

        # Verify include_image_name
        self.assertIn("include_image_name", required)
        img_flag = required["include_image_name"]
        self.assertEqual(img_flag[0], "BOOLEAN")
        self.assertEqual(img_flag[1].get("default"), False)

        # Verify subfolder_mode contains By Input Image Name
        self.assertIn("subfolder_mode", required)
        subfolder_mode = required["subfolder_mode"]
        self.assertIn("By Input Image Name", subfolder_mode[0])

    def test_save_images_execution_with_input_image_name(self):
        # Create dummy image tensor [1, 64, 64, 3]
        dummy_img = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
        mock_prompt = {
            "1": {
                "class_type": "LoadImage",
                "inputs": {"image": "test_input_sample_01.png"}
            },
            "2": {
                "class_type": "AdvancedSaveImage",
                "inputs": {"images": ["1", 0]}
            }
        }
        res = self.node.save_images(
            images=dummy_img,
            include_image_name=True,
            include_model_name=False,
            include_timestamp=False,
            custom_text="test",
            subfolder_mode="None",
            play_sound_on_finish=False,
            prompt=mock_prompt,
            unique_id="2"
        )
        self.assertIn("ui", res)
        self.assertIn("images", res["ui"])
        self.assertEqual(len(res["ui"]["images"]), 1)
        saved_fn = res["ui"]["images"][0]["filename"]
        self.assertTrue(saved_fn.startswith("Test_input_sample_01_test"))


if __name__ == "__main__":
    unittest.main()
