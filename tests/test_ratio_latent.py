import unittest
import torch
from nodes.ratio_latent_node import RatioLatentGenerator


class TestRatioLatentGenerator(unittest.TestCase):
    def setUp(self):
        self.node = RatioLatentGenerator()

    def test_input_types(self):
        types = RatioLatentGenerator.INPUT_TYPES()
        self.assertIn("required", types)
        self.assertIn("longest_side", types["required"])
        self.assertIn("aspect_ratio", types["required"])
        self.assertIn("swap_dimensions", types["required"])
        self.assertIn("optional", types)
        self.assertIn("image", types["optional"])
        self.assertIn("mask", types["optional"])

    def test_aspect_ratio_16_9_landscape(self):
        w, h, latent, out_img, out_mask = self.node.generate(
            longest_side=1024,
            aspect_ratio="16:9",
            swap_dimensions=False,
            batch_size=1,
            crop_mode="letterbox",
            method="bicubic"
        )
        self.assertEqual(w, 1024)
        self.assertEqual(h % 32, 0)
        self.assertEqual(latent["samples"].shape, (1, 4, h // 8, w // 8))
        self.assertEqual(latent["downscale_ratio_spacial"], 8)

    def test_aspect_ratio_16_9_portrait_swapped(self):
        w, h, latent, out_img, out_mask = self.node.generate(
            longest_side=1024,
            aspect_ratio="16:9",
            swap_dimensions=True,
            batch_size=2,
            crop_mode="letterbox",
            method="bicubic"
        )
        self.assertEqual(h, 1024)
        self.assertEqual(w % 32, 0)
        self.assertEqual(latent["samples"].shape, (2, 4, h // 8, w // 8))

    def test_input_image_overrides_aspect_ratio(self):
        # Create a mock image with shape [1, 600, 800, 3] (4:3 aspect ratio)
        mock_image = torch.zeros([1, 600, 800, 3], dtype=torch.float32)
        
        w, h, latent, out_img, out_mask = self.node.generate(
            longest_side=1024,
            aspect_ratio="1:1",  # Provided 1:1, but input image is 4:3
            swap_dimensions=False,
            batch_size=1,
            crop_mode="stretch",
            method="bilinear",
            image=mock_image
        )
        # Expected width: 1024, height: 768 (4:3 ratio)
        self.assertEqual(w, 1024)
        self.assertEqual(h, 768)
        self.assertEqual(out_img.shape, (1, 768, 1024, 3))
        self.assertEqual(latent["samples"].shape, (1, 4, 768 // 8, 1024 // 8))

    def test_input_mask_overrides_aspect_ratio(self):
        # Create a mock mask with shape [2, 1200, 600] (1:2 vertical ratio)
        mock_mask = torch.zeros([2, 1200, 600], dtype=torch.float32)

        w, h, latent, out_img, out_mask = self.node.generate(
            longest_side=1024,
            aspect_ratio="16:9",
            swap_dimensions=False,
            batch_size=1,
            crop_mode="letterbox",
            method="bilinear",
            mask=mock_mask
        )
        self.assertEqual(h, 1024)
        self.assertEqual(w, 512)
        self.assertEqual(out_mask.shape, (2, 1024, 512))
        self.assertEqual(latent["samples"].shape, (2, 4, 1024 // 8, 512 // 8))


if __name__ == "__main__":
    unittest.main()
