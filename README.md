# Zeno-node (ComfyUI Custom Nodes Pack)

A professional extension pack for **ComfyUI** designed to streamline latent generation and smart image saving workflows:

1. **Zeno - Advanced Save Image**: Intelligent file naming (Model ➔ Timestamp ➔ Custom text), automatic model detection from the workflow graph, flexible subfolder organization (by Date/Model), full workflow metadata retention, and audio notifications.
2. **Zeno - Smart Ratio Latent Generator**: Standard aspect ratio latent generation with automatic VAE-safe rounding (multiples of 32), and built-in image/mask transformation (Stretch / Crop / Letterbox).

---

## 📦 Nodes Included

### 1. Zeno - Advanced Save Image
- **Category:** `Zeno/Image`
- **Class:** `AdvancedSaveImage`
- **Key Features:**
  - **Smart Naming Hierarchy:** Model Name (auto-detected from workflow) ➔ Timestamp ➔ Custom Text.
  - **Consistent Formatting:** Clean capitalization (first letter capitalized, all following letters lowercase). Strips special characters and redundant digits from model names.
  - **Subfolder Organization:** Group output images by Date (`YYYY-MM-DD`), Model Name, or a Custom Subfolder path.
  - **Lossless PNG & Metadata:** Preserves full PNGInfo workflow metadata for drag-and-drop workflow reloading.
  - **Completion Chime:** Optional audio alert (`play_sound_on_finish`) when generation and saving complete.

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `images` | `IMAGE` | *(required)* | Input image tensor list |
| `include_model_name` | `BOOLEAN` | `True` | Automatically detect and prepend model/checkpoint name |
| `include_timestamp` | `BOOLEAN` | `True` | Append timestamp to filename |
| `timestamp_format` | `COMBO` | `%Y%m%d_%H%M%S` | Timestamp format string |
| `custom_text` | `STRING` | `""` | User-defined custom text, tags, or concepts |
| `subfolder_mode` | `COMBO` | `None` | Subfolder grouping mode |
| `custom_subfolder` | `STRING` | `""` | Custom folder name (used when mode is `Custom Subfolder`) |
| `save_workflow_metadata` | `BOOLEAN` | `True` | Embed ComfyUI workflow metadata in PNG files |
| `play_sound_on_finish` | `BOOLEAN` | `False` | Play an audible notification chime when saving finishes |

---

### 2. Zeno - Smart Ratio Latent Generator
- **Category:** `Zeno/Latent`
- **Class:** `RatioLatentGenerator`
- **Key Features:**
  - **Standard Aspect Ratios:** Supports `1:1`, `5:4`, `4:3`, `3:2`, `16:9`, `21:9`, `2.35:1`, or automatic ratio detection from input image/mask.
  - **VAE-Safe Multiples of 32:** Automatically calculates and snaps dimensions to multiples of 32 to prevent VAE decode errors.
  - **Synchronized Image / Mask Transformation:** Supports `stretch`, `crop` (center crop), and `letterbox` (padding) with interpolation methods (`bicubic`, `bilinear`, `nearest`, `area`).

---

## 📥 Installation

### Method 1: Git Clone (Recommended)
```bash
cd ComfyUI/custom_nodes
git clone https://github.com/ZenoSigma/Zeno-node.git
pip install -r Zeno-node/requirements.txt
```

### Method 2: ComfyUI Manager
- Open ComfyUI ➔ Click **Manager** ➔ **Custom Nodes Manager** ➔ Search for `Zeno-node` (or click **Install via Git URL** and paste `https://github.com/ZenoSigma/Zeno-node.git`).

---

## 🚀 Repository Structure

```bash
Zeno-node/
├── __init__.py
├── README.md
├── AGENTS.md
├── CLAUDE.md
├── .cursorrules
├── pyproject.toml
├── LICENSE
├── requirements.txt
├── .gitignore
├── docs/
│   ├── architecture.md
│   ├── api_spec.md
│   └── algorithm.md
├── nodes/
│   ├── __init__.py
│   ├── advanced_save_image.py
│   └── ratio_latent_node.py
└── tests/
    └── test_naming.py
```

---

## 🧪 Testing

```bash
python -m unittest discover tests
```

---

## 📚 Technical Documentation & AI Guidelines

Detailed architectural specifications and multi-AI development protocols:
- [Architecture & Data Pipeline](docs/architecture.md) - Pipeline diagrams, layer separation, execution flows.
- [API & Node Specification](docs/api_spec.md) - Input widgets, hidden parameters, output signatures.
- [Algorithm & Math Principles](docs/algorithm.md) - VAE-safe snap-to-32 calculations, spatial interpolation transforms.
- [AI Operator Guidelines](AGENTS.md) - 6-step AI onboarding sequence, branch management (`feat/`, `fix/`), Conventional Commits.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
