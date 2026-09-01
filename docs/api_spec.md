# API Specification & Node Interface Reference

This document defines the complete interface specification, parameter types, hidden execution inputs, and return signatures for all nodes in **Zeno-node**.

---

## 1. 🖼️ Node: `Zeno - Advanced Save Image`

- **Class Name:** `AdvancedSaveImage`
- **Category:** `Zeno/Image`
- **Output Node:** `True`

### A. Input Parameters (`INPUT_TYPES`)

#### Required Inputs:
| Parameter | Type | Default | Options / Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `images` | `IMAGE` | *(required)* | PyTorch Tensor `[B, H, W, C]` | List/batch of images to save and preview. |
| `include_image_name`| `BOOLEAN` | `True` | `True` / `False` | Automatically detect and prepend the first 12 characters of the input image filename to the output filename (prioritized before model name). |
| `include_model_name`| `BOOLEAN` | `True` | `True` / `False` | Prepend auto-detected model name to filename. |
| `include_timestamp` | `BOOLEAN` | `True` | `True` / `False` | Append current timestamp to filename. |
| `timestamp_format` | `COMBO` | `%Y%m%d_%H%M%S` | `["%Y%m%d_%H%M%S", "%Y-%m-%d_%H-%M-%S", "%Y%m%d", "%H%M%S"]` | Timestamp pattern string. |
| `custom_text` | `STRING` | `""` | Single-line string | Custom text, notes, or tags to append. |
| `subfolder_mode` | `COMBO` | `"None"` | `["None", "By Date (YYYY-MM-DD)", "By Model Name", "By Input Image Name", "Custom Subfolder"]` | Target subfolder grouping mode. |
| `custom_subfolder` | `STRING` | `""` | Single-line string | Name/relative path for custom subfolder. |
| `save_workflow_metadata`| `BOOLEAN` | `True` | `True` / `False` | Embed prompt and workflow metadata into PNG files. |
| `play_sound_on_finish` | `BOOLEAN` | `True` | `True` / `False` | Play completion audio alert chime. |
| `sound_choice` | `COMBO` | `"Chimes"` | `["Chimes", "Ding", "Notify", "Tada", "Chord", "Speech On", "Ring", "Windows Default", "Synth Bell", "Asterisk", "Exclamation"]` | Alert chime sound type (with interactive preview button). |

#### Hidden Inputs:
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `prompt` | `PROMPT` | ComfyUI execution graph dictionary containing node definitions and inputs. |
| `extra_pnginfo` | `EXTRA_PNGINFO` | Workflow graph UI JSON for drag-and-drop reconstruction. |
| `unique_id` | `UNIQUE_ID` | Node ID of the executing save node for accurate upstream graph traversal. |

### B. Output Signatures (`RETURN_TYPES`)

| Output Name | Type | Description |
| :--- | :--- | :--- |
| `images` | `IMAGE` | Pass-through input image tensor. |
| `file_paths` | `STRING` | Newline-separated list of absolute file paths saved on disk. |

---

## 2. 📐 Node: `Zeno - Smart Ratio Latent Generator`

- **Class Name:** `RatioLatentGenerator`
- **Category:** `Zeno/Latent`
- **Output Node:** `False`

### A. Input Parameters (`INPUT_TYPES`)

#### Required Inputs:
| Parameter | Type | Default | Options / Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `longest_side` | `INT` | `1024` | `min: 1024`, `max: 4000`, `step: 32` | Target length for the longest edge. |
| `aspect_ratio` | `COMBO` | `"1:1"` | `["1:1", "5:4", "4:3", "3:2", "16:9", "21:9", "2.35:1"]` | Target aspect ratio. |
| `swap_dimensions` | `BOOLEAN` | `False` | `True` / `False` | Invert width and height for landscape/portrait toggle. |
| `batch_size` | `INT` | `1` | `min: 1`, `max: 64`, `step: 1` | Number of empty latent samples. |
| `crop_mode` | `COMBO` | `"letterbox"` | `["letterbox", "crop", "stretch"]` | Transformation mode for optional image/mask. |
| `method` | `COMBO` | `"bicubic"` | `["bicubic", "bilinear", "nearest", "area"]` | PyTorch interpolation algorithm. |

#### Optional Inputs:
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `image` | `IMAGE` | Optional input image to transform to target aspect ratio and dimensions. |
| `mask` | `MASK` | Optional input mask to transform to target aspect ratio and dimensions. |

### B. Output Signatures (`RETURN_TYPES`)

| Output Name | Type | Description |
| :--- | :--- | :--- |
| `WIDTH` | `INT` | Calculated width (guaranteed multiple of 32). |
| `HEIGHT` | `INT` | Calculated height (guaranteed multiple of 32). |
| `EMPTY_LATENT` | `LATENT` | Dictionary `{"samples": Tensor [B, 4, H // 8, W // 8], "downscale_ratio_spacial": 8}`. |
| `IMAGE` | `IMAGE` | Transformed image tensor `[B, H, W, C]` (or black canvas if not supplied). |
| `MASK` | `MASK` | Transformed mask tensor `[B, H, W]` (or zero mask if not supplied). |

---

## 3. 📝 Node: `Zeno - Prompt Library`

- **Class Name:** `PromptLibrary`
- **Category:** `Zeno/Text`
- **Output Node:** `False`

### A. Input Parameters (`INPUT_TYPES`)

#### Required Inputs:
| Parameter | Type | Default | Options / Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `selected_index` | `INT` | `1` | `min: 1`, `max: 9999`, `step: 1` | 1-based slot number to output. |

#### Optional Inputs (UI-Managed):
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `slots_json` | `STRING` | Serialized JSON array of prompt slots (`[{"id": "...", "title": "...", "prompt": "..."}]`) maintained by frontend UI widget (hidden from node interface). |

### B. Output Signatures (`RETURN_TYPES`)

| Output Name | Type | Description |
| :--- | :--- | :--- |
| `prompt` | `STRING` | The exact prompt text stored in the selected slot. |

