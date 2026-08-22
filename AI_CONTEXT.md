# AI Context & Fast Briefing

**Repository:** `Zeno-node` (ComfyUI Custom Nodes Pack)
**Tech Stack:** Python 3.10+, PyTorch, Torchvision, NumPy, Pillow, ComfyUI API, JavaScript (LiteGraph / ComfyUI DOM Extension)
**Primary Branch:** `main` | **Working Branches:** `feat/...`, `fix/...`, `docs/...`

---

## 🎯 Purpose & Capabilities
A high-performance ComfyUI custom node suite providing 3 production-ready nodes:
1. **`Zeno - Advanced Save Image` (`AdvancedSaveImage`):** Auto checkpoint detection from graph (`PROMPT`), sanitized hierarchical naming (`Model_Timestamp_CustomText`), subfolder grouping, PNGInfo metadata embedding, and completion chime.
2. **`Zeno - Smart Ratio Latent Generator` (`RatioLatentGenerator`):** VAE-safe aspect ratio snapping (multiples of 32 between 256 and 4000), `EMPTY_LATENT` generation, and synchronized spatial transforms (`stretch`, `crop`, `letterbox`) for `IMAGE` and `MASK`.
3. **`Zeno - Prompt Library` (`PromptLibrary`):** In-workflow multi-slot prompt management with interactive canvas UI, organizer titles, 1-based index switching, and single `STRING` scalar output.

---

## 🧭 Entrypoints & File Map
- **Package Root:** [`__init__.py`](file:///e:/Backup/Work/R-D/Tool%20AI/Comfy%20Node/Zeno-node/__init__.py) (Exports `NODE_CLASS_MAPPINGS`, `NODE_DISPLAY_NAME_MAPPINGS`, `WEB_DIRECTORY = "./web"`).
- **Core Node Logic:**
  - [`nodes/advanced_save_image.py`](file:///e:/Backup/Work/R-D/Tool%20AI/Comfy%20Node/Zeno-node/nodes/advanced_save_image.py)
  - [`nodes/ratio_latent_node.py`](file:///e:/Backup/Work/R-D/Tool%20AI/Comfy%20Node/Zeno-node/nodes/ratio_latent_node.py)
  - [`nodes/prompt_library_node.py`](file:///e:/Backup/Work/R-D/Tool%20AI/Comfy%20Node/Zeno-node/nodes/prompt_library_node.py)
- **Frontend Extensions:** [`web/prompt_library.js`](file:///e:/Backup/Work/R-D/Tool%20AI/Comfy%20Node/Zeno-node/web/prompt_library.js), [`web/smart_ratio.js`](file:///e:/Backup/Work/R-D/Tool%20AI/Comfy%20Node/Zeno-node/web/smart_ratio.js).
- **Unit Test Suite:** [`tests/test_naming.py`](file:///e:/Backup/Work/R-D/Tool%20AI/Comfy%20Node/Zeno-node/tests/test_naming.py), [`tests/test_prompt_library.py`](file:///e:/Backup/Work/R-D/Tool%20AI/Comfy%20Node/Zeno-node/tests/test_prompt_library.py), [`tests/test_ratio_latent.py`](file:///e:/Backup/Work/R-D/Tool%20AI/Comfy%20Node/Zeno-node/tests/test_ratio_latent.py).

---

## 🧪 Verification & Operational Rules
- **Run Tests:** `python -m unittest discover tests` (Must pass 100% before commit/merge).
- **Invariants:**
  - Never delete defensive checks or `try/except` blocks.
  - Never commit directly to `main` without testing.
  - Always preserve backward compatibility with existing workflows.
- **Deep Documentation:** See [`docs/architecture.md`](file:///e:/Backup/Work/R-D/Tool%20AI/Comfy%20Node/Zeno-node/docs/architecture.md), [`docs/api_spec.md`](file:///e:/Backup/Work/R-D/Tool%20AI/Comfy%20Node/Zeno-node/docs/api_spec.md), and [`docs/algorithm.md`](file:///e:/Backup/Work/R-D/Tool%20AI/Comfy%20Node/Zeno-node/docs/algorithm.md).
