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


if __name__ == "__main__":
    unittest.main()
