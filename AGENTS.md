# AGENTS.md - Developer & AI Operator Guide

Guidelines and architectural specifications for AI agents, developers, and contributors working on **Zeno-node**.

---

## 🧭 AI Onboarding & Context Reading Order (6-Step Protocol)

When an AI agent or contributor starts working on this repository, you **MUST** read files in the following strict sequential order:

1. **Step 1 - Rules & Live Status:** Read `STATUS.md` -> `AGENTS.md` / `CLAUDE.md` / `.cursorrules` (Review current status, node invariants, never delete try/except blocks, never commit directly to `main`).
2. **Step 2 - Architecture & Data Flow:** Read `docs/architecture.md`, `docs/api_spec.md`, and `docs/algorithm.md` (Understand tensor shapes and data pipelines before writing code).
3. **Step 3 - Dependencies & Config:** Read `requirements.txt` and `pyproject.toml`.
4. **Step 4 - Entrypoint & Node Mappings:** Read `__init__.py` and `nodes/__init__.py`.
5. **Step 5 - Core Logic & Nodes:** Read `nodes/advanced_save_image.py`, `nodes/ratio_latent_node.py`, and `nodes/prompt_library_node.py`.
6. **Step 6 - Verification & Tests:** Read `tests/test_naming.py`, `tests/test_prompt_library.py` and run tests (`python -m unittest discover tests`).


---

## 1. 🛠️ Tech Stack & Dependencies

- **Language:** Python 3.10+
- **Core Frameworks & Libraries:**
  - **PyTorch (`torch`, `torch.nn.functional`):** Tensor operations, GPU/CPU memory management, interpolation, and spatial transformations.
  - **Torchvision:** Computer vision primitives and image transforms.
  - **NumPy (`numpy`):** Array transformations, clipping, and numerical conversions.
  - **Pillow (`PIL.Image`, `PIL.PngImagePlugin.PngInfo`):** Lossless PNG serialization and metadata encapsulation.
  - **ComfyUI API Interop:**
    - `folder_paths.get_output_directory()` / `folder_paths.get_save_image_path()`
    - `comfy.cli_args`
    - `comfy.model_management.intermediate_device()` / `intermediate_dtype()`
- **Testing:** Python standard `unittest`.

---

## 2. 🏗️ Data Architecture & Tensor Specifications

### A. Tensor Specifications
| Data Type | ComfyUI Representation | Shape | Value Range / Dtype |
| :--- | :--- | :--- | :--- |
| **`IMAGE`** | PyTorch FloatTensor | `[B, H, W, C]` | `[0.0, 1.0]`, float32, RGB channel order |
| **`MASK`** | PyTorch FloatTensor | `[B, H, W]` | `[0.0, 1.0]`, float32 |
| **`LATENT`** | Python `dict` | `{"samples": Tensor [B, 4, H // 8, W // 8], "downscale_ratio_spacial": 8}` | Latent space tensor float32 / float16 |

### B. Transformation & Interpolation Pipeline
- **BCHW Permutation:** To apply PyTorch functional transforms, images are permuted from `[B, H, W, C]` to `[B, C, H, W]` before calling `F.interpolate` and permuted back.
- **Aspect Ratio Snapping:** Dimension calculation enforces `round(dimension / 32) * 32` within `[256, 4000]` limits to guarantee VAE safety.
- **Transformation Modes:**
  - `stretch`: Linear non-uniform scaling to exact target bounds.
  - `crop`: Uniform scaling to cover bounds with centered slicing.
  - `letterbox`: Uniform scaling to fit within bounds with centered constant-value padding.

### C. Metadata & Execution Graph Traversal
- **Prompt Graph Inspection:** Traverses the ComfyUI execution graph (`PROMPT` dict) across standard loaders (`CheckpointLoaderSimple`, `UNETLoader`, etc.) and dynamic slot selectors (`CheckpointSwitch`).
- **Filename Sanitization:** Model names are stripped of file extensions, digits, and special characters, formatted with leading uppercase casing.
- **Metadata Preservation:** PNG metadata embeds workflow graph JSON (`prompt` and `extra_pnginfo`) via `PngInfo`.

---

## 3. 🧪 Commands: Run, Test & Verify

### Run Unit Tests
```bash
python -m unittest discover tests
```

### Run Specific Test Suite
```bash
python -m unittest tests/test_naming.py
```

### Installation / Setup
```bash
# In your ComfyUI root directory:
cd custom_nodes
git clone https://github.com/ZenoSigma/Zeno-node.git
pip install -r Zeno-node/requirements.txt
```

---

## 4. 🤖 AI & Contribution Workflow Protocol

All AI agents and human contributors MUST adhere to the following workflow:

### A. Core Operational Invariants
- **DO NOT remove logic, parameters, edge cases, error handling (try/catch), or defensive checks.**
- **DO NOT commit directly to `main` branch for non-trivial modifications.**
- Always preserve full backward compatibility with existing ComfyUI workflows.

### B. Branch Management
- Always create a dedicated working branch for changes:
  ```bash
  git checkout -b <type>/<short-description>
  # Examples:
  # git checkout -b feat/support-flux-latent
  # git checkout -b fix/pnginfo-unicode-bug
  # git checkout -b docs/update-agents-spec
  ```

### C. Commit Message Conventions
- Write structured commit messages following Conventional Commits:
  - `feat: <summary>` - New functionality
  - `fix: <summary>` - Bug fixes
  - `refactor: <summary>` - Code refactoring with zero behavior regression
  - `docs: <summary>` - Documentation updates
  - `test: <summary>` - Adding or updating unit tests
  - `chore: <summary>` - Maintenance tasks
- **Summary Requirement:** Always summarize what was changed, the rationale, and verify tests passed before requesting merge.

### D. Merge Checklist
1. All unit tests pass cleanly: `python -m unittest discover tests`.
2. No unnecessary dependencies or cache artifacts (`__pycache__`, `.pyc`) committed.
3. Code preserves full backward compatibility with ComfyUI nodes and existing workflows.
4. Merge into `main` after verification.
