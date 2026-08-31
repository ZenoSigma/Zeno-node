# CLAUDE.md - Instructions for Claude Code CLI

Guidelines and operational protocols for Claude Code when working on **Zeno-node**.

---

## 🧭 AI Onboarding & Context Reading Order

Follow this strict 6-step sequential reading order before writing code:

1. **Step 1 - Rules & Live Status:** `STATUS.md` -> `AGENTS.md` / `CLAUDE.md` (Strict invariants, current phase, error handling preservation, branch rules).
2. **Step 2 - Architecture & Specs:** `docs/architecture.md`, `docs/api_spec.md`, and `docs/algorithm.md` (Data pipelines, tensor dimensions).
3. **Step 3 - Dependencies & Config:** `requirements.txt` and `pyproject.toml`.
4. **Step 4 - Entrypoint:** `__init__.py` and `nodes/__init__.py`.
5. **Step 5 - Core Nodes:** `nodes/advanced_save_image.py`, `nodes/ratio_latent_node.py`, and `nodes/prompt_library_node.py`.
6. **Step 6 - Verification:** `tests/test_naming.py`, `tests/test_prompt_library.py` and run tests (`python -m unittest discover tests`).


---

## 🛠️ Tech Stack & Key APIs
- **Python 3.10+**
- **PyTorch (`torch`, `torch.nn.functional`):** Image layout `[B, H, W, C]`, PyTorch layout `[B, C, H, W]`, Latent `[B, 4, H // 8, W // 8]`.
- **ComfyUI API:** `folder_paths`, `comfy.model_management`, `comfy.cli_args`.
- **Testing:** `python -m unittest discover tests`.

---

## 🛑 Strict Rules & Operational Invariants
- **NEVER** remove `try/except` blocks, edge-case handling, or defensive parameter checks.
- **NEVER** commit directly to the `main` branch.
- **ALWAYS** create a dedicated branch (`feat/...`, `fix/...`, `docs/...`).
- **ALWAYS** write Conventional Commit messages summarizing changes and verifying unit tests pass before merge.
