# APP_OVERVIEW.md - Architectural & Module Map

This document provides a persistent overview of the module layout, component responsibilities, and data contracts of **Zeno-node**.

---

## 🏗️ Architectural Layout

```
Zeno-node/
├── __init__.py                     # Package entrypoint, node & web directory mappings
├── AI_CONTEXT.md                   # Rapid AI context recovery (<100 lines)
├── APP_OVERVIEW.md                 # Module map & architecture overview
├── AGENTS.md / CLAUDE.md           # Multi-AI operator guidelines & onboarding sequence
├── .cursorrules                    # Rules for Cursor & Windsurf AI
├── pyproject.toml / requirements   # Dependencies & ComfyUI publisher configuration
├── docs/                           # Deep technical specifications
│   ├── architecture.md             # End-to-end data pipeline diagrams
│   ├── api_spec.md                 # Node input/output interfaces & hidden parameters
│   └── algorithm.md                # Mathematical formulas & spatial transformation algorithms

├── nodes/                          # Python backend node implementations
│   ├── __init__.py
│   ├── advanced_save_image.py      # AdvancedSaveImage (Graph inspection, naming, PNGInfo)
│   ├── ratio_latent_node.py        # RatioLatentGenerator (Aspect ratio snapping, tensor transforms)
│   └── prompt_library_node.py      # PromptLibrary (Slot validation, index selection)
├── web/                            # ComfyUI frontend web extensions
│   └── js/
│       └── prompt_library.js       # Interactive LiteGraph / DOM canvas widget
└── tests/                          # Automated unittest test suites
    ├── test_naming.py              # Test suite for graph inspection & naming pipelines
    └── test_prompt_library.py      # Test suite for prompt library JSON parsing & boundaries
```

---

## 🧩 Component Responsibilities

### 1. Node Registration (`__init__.py`)
- Maps Python classes (`AdvancedSaveImage`, `RatioLatentGenerator`, `PromptLibrary`) to ComfyUI node keys.
- Maps internal keys to user-facing display names (`Zeno - Advanced Save Image`, `Zeno - Smart Ratio Latent Generator`, `Zeno - Prompt Library`).
- Declares `WEB_DIRECTORY = "./web"` to load frontend JavaScript extensions.

### 2. Advanced Save Image Pipeline (`nodes/advanced_save_image.py`)
- Recursively parses execution graph (`PROMPT` dict) to find active checkpoints or switcher choices.
- Sanitizes strings: strips extensions, digits (for models), non-alpha characters, and applies `Upper_lower` casing.
- Generates file paths via `folder_paths.get_save_image_path()`, embeds `prompt` & `extra_pnginfo` into lossless PNG, and sounds an alert chime.

### 3. Smart Ratio Latent Generator (`nodes/ratio_latent_node.py`)
- Calculates optimal longest edge snapped to multiple of 32: $L_{opt} = \text{clamp}(\text{round}(L / 32) \times 32, 1024, 4000)$.
- Calculates secondary dimension preserving aspect ratio snapped to multiple of 32.
- Allocates `EMPTY_LATENT` tensor `[B, 4, H // 8, W // 8]` on `intermediate_device()`.
- Synchronously resizes/crops/letterboxes optional input `IMAGE` and `MASK` tensors.

### 4. Prompt Library Pipeline (`nodes/prompt_library_node.py` + `web/prompt_library.js`)
- Frontend DOM widget renders a dynamic list of slots (Index badge, Title input, Prompt textarea, Remove button) and Add Slot control.
- State is serialized into a hidden widget `slots_json` and restored via `onConfigure`.
- Backend parses JSON, enforces 1-based index boundary ($1 \le k \le N$), rejects blank prompt bodies, and returns the selected prompt scalar string.

---

## 🧪 Verification Standard

All modifications must pass the unit test suite:
```bash
python -m unittest discover tests
```
Current Status: **15 tests passing** (100% success rate).
