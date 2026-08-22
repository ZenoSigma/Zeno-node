import unittest
import json
from nodes.prompt_library_node import PromptLibrary


class TestPromptLibraryNode(unittest.TestCase):
    def setUp(self):
        self.node = PromptLibrary()

    def test_default_slot_behavior_raises_on_empty(self):
        # Default initialization has an empty prompt, so executing it should raise ValueError
        with self.assertRaises(ValueError) as ctx:
            self.node.get_prompt(selected_index=1)
        self.assertIn("empty", str(ctx.exception).lower())

    def test_valid_single_slot(self):
        slots_json = json.dumps([
            {"id": "slot-1", "title": "Portrait", "prompt": "masterpiece, 8k portrait of a cyberpunk girl"}
        ])
        result = self.node.get_prompt(selected_index=1, slots_json=slots_json)
        self.assertEqual(result, ("masterpiece, 8k portrait of a cyberpunk girl",))

    def test_multiple_slots_selection(self):
        slots_json = json.dumps([
            {"id": "slot-1", "title": "Portrait", "prompt": "portrait photo, soft rim lighting"},
            {"id": "slot-2", "title": "Landscape", "prompt": "scenic mountain lake at sunrise, highly detailed"},
            {"id": "slot-3", "title": "SciFi", "prompt": "futuristic spaceship interior, neon lights"}
        ])
        # Slot 1
        res1 = self.node.get_prompt(selected_index=1, slots_json=slots_json)
        self.assertEqual(res1, ("portrait photo, soft rim lighting",))

        # Slot 2
        res2 = self.node.get_prompt(selected_index=2, slots_json=slots_json)
        self.assertEqual(res2, ("scenic mountain lake at sunrise, highly detailed",))

        # Slot 3
        res3 = self.node.get_prompt(selected_index=3, slots_json=slots_json)
        self.assertEqual(res3, ("futuristic spaceship interior, neon lights",))

    def test_unicode_and_vietnamese_preservation(self):
        vietnamese_prompt = (
            "Chân dung nghệ thuật của một thiếu nữ Việt Nam mặc áo dài trắng, "
            "ánh sáng hoàng hôn ấm áp, chi tiết sắc nét, 8k, phong cách điện ảnh."
        )
        slots_json = json.dumps([
            {"id": "slot-vn", "title": "Áo dài Việt Nam", "prompt": vietnamese_prompt}
        ])
        result = self.node.get_prompt(selected_index=1, slots_json=slots_json)
        self.assertEqual(result, (vietnamese_prompt,))

    def test_newlines_and_formatting_preservation(self):
        multiline_prompt = "Line 1: High quality portrait,\nLine 2: cinematic lighting,\nLine 3: 35mm photography."
        slots_json = json.dumps([
            {"id": "slot-multi", "title": "Multiline", "prompt": multiline_prompt}
        ])
        result = self.node.get_prompt(selected_index=1, slots_json=slots_json)
        self.assertEqual(result, (multiline_prompt,))

    def test_title_isolation(self):
        title = "Very Secret Internal Note"
        prompt = "ultra realistic nature photography"
        slots_json = json.dumps([
            {"id": "slot-1", "title": title, "prompt": prompt}
        ])
        result = self.node.get_prompt(selected_index=1, slots_json=slots_json)
        self.assertEqual(result, (prompt,))
        self.assertNotIn(title, result[0])

    def test_index_out_of_bounds_lower(self):
        slots_json = json.dumps([
            {"id": "slot-1", "title": "Test", "prompt": "some prompt"}
        ])
        with self.assertRaises(ValueError) as ctx:
            self.node.get_prompt(selected_index=0, slots_json=slots_json)
        self.assertIn(">= 1", str(ctx.exception))

        with self.assertRaises(ValueError) as ctx:
            self.node.get_prompt(selected_index=-5, slots_json=slots_json)
        self.assertIn(">= 1", str(ctx.exception))

    def test_index_out_of_bounds_upper(self):
        slots_json = json.dumps([
            {"id": "slot-1", "title": "Test 1", "prompt": "prompt 1"},
            {"id": "slot-2", "title": "Test 2", "prompt": "prompt 2"}
        ])
        with self.assertRaises(ValueError) as ctx:
            self.node.get_prompt(selected_index=3, slots_json=slots_json)
        self.assertIn("exceeds total available slots", str(ctx.exception))

    def test_blank_prompt_rejection(self):
        slots_json = json.dumps([
            {"id": "slot-1", "title": "Blank Slot", "prompt": "   \n\t  "}
        ])
        with self.assertRaises(ValueError) as ctx:
            self.node.get_prompt(selected_index=1, slots_json=slots_json)
        self.assertIn("empty", str(ctx.exception).lower())

    def test_malformed_json_handling(self):
        with self.assertRaises(ValueError) as ctx:
            self.node.get_prompt(selected_index=1, slots_json="{invalid-json}")
        self.assertIn("parse slot JSON", str(ctx.exception))

    def test_non_list_json_handling(self):
        with self.assertRaises(ValueError) as ctx:
            self.node.get_prompt(selected_index=1, slots_json='{"single": "object"}')
        self.assertIn("Expected a JSON array/list", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
