# Algorithm & Mathematical Principles Specification

This document details the mathematical algorithms, formulas, and processing pipelines implemented in **Zeno-node**.

---

## 1. 📐 VAE-Safe Dimension & Aspect Ratio Snapping

### Mathematical Formulation
ComfyUI VAE decoders downscale/upscale spatial dimensions by a factor of 8 (\(H/8, W/8\)). To eliminate spatial dimension mismatches across multi-scale convolutional layers, all spatial dimensions are snapped to multiples of 32.

Given:
- Requested longest side \( L_{req} \in [1024, 4000] \)
- Aspect ratio \( W_r : H_r \) (or dimensions derived from input image/mask \( W_{in}, H_{in} \))

#### Step 1: Longest Dimension Snapping
\[
L_{opt} = \min\left(4000, \max\left(1024, \left\lfloor \frac{L_{req}}{32} + 0.5 \right\rfloor \times 32\right)\right)
\]

#### Step 2: Complementary Dimension Calculation
- **If \( W_r \ge H_r \) (Landscape or Square):**
  \[
  \text{Width} = L_{opt}
  \]
  \[
  \text{Height} = \max\left(256, \left\lfloor \frac{L_{opt} \times \frac{H_r}{W_r}}{32} + 0.5 \right\rfloor \times 32\right)
  \]

- **If \( H_r > W_r \) (Portrait):**
  \[
  \text{Height} = L_{opt}
  \]
  \[
  \text{Width} = \max\left(256, \left\lfloor \frac{L_{opt} \times \frac{W_r}{H_r}}{32} + 0.5 \right\rfloor \times 32\right)
  \]

---

## 2. 🖼️ Spatial Tensor Transformation Modes

All tensor operations convert input tensor from ComfyUI shape \([B, H, W, C]\) to PyTorch layout \([B, C, H, W]\), perform spatial transformation, and permute back.

### A. Stretch Mode (`stretch` / `fill`)
Performs direct non-uniform 2D spatial interpolation:
\[
T_{out} = \text{Interpolate}(T_{in}, \text{size}=(H_{target}, W_{target}))
\]

### B. Center Crop Mode (`crop`)
Uniformly scales the image to fully cover the target viewport, then extracts a centered slice:
1. Scale factor:
   \[
   s = \max\left(\frac{W_{target}}{W_{cur}}, \frac{H_{target}}{H_{cur}}\right)
   \]
2. Intermediate resized dimension:
   \[
   W_{interp} = \text{round}(W_{cur} \times s), \quad H_{interp} = \text{round}(H_{cur} \times s)
   \]
3. Centered offsets:
   \[
   \Delta_x = \max\left(0, \left\lfloor \frac{W_{interp} - W_{target}}{2} \right\rfloor\right)
   \]
   \[
   \Delta_y = \max\left(0, \left\lfloor \frac{H_{interp} - H_{target}}{2} \right\rfloor\right)
   \]
4. Slice:
   \[
   T_{out} = T_{interp}[:, :, \Delta_y : \Delta_y + H_{target}, \Delta_x : \Delta_x + W_{target}]
   \]

### C. Letterbox Padding Mode (`letterbox`)
Uniformly scales the image to fit entirely within the target viewport and pads remaining borders with a constant value:
1. Scale factor:
   \[
   s = \min\left(\frac{W_{target}}{W_{cur}}, \frac{H_{target}}{H_{cur}}\right)
   \]
2. Padding dimensions:
   \[
   \text{Pad}_{total, x} = \max(0, W_{target} - W_{interp}), \quad \text{Pad}_{left} = \lfloor \text{Pad}_{total, x} / 2 \rfloor, \quad \text{Pad}_{right} = \text{Pad}_{total, x} - \text{Pad}_{left}
   \]
   \[
   \text{Pad}_{total, y} = \max(0, H_{target} - H_{interp}), \quad \text{Pad}_{top} = \lfloor \text{Pad}_{total, y} / 2 \rfloor, \quad \text{Pad}_{bottom} = \text{Pad}_{total, y} - \text{Pad}_{top}
   \]
3. Pad:
   \[
   T_{out} = \text{Pad}(T_{interp}, (\text{Pad}_{left}, \text{Pad}_{right}, \text{Pad}_{top}, \text{Pad}_{bottom}), \text{value}=0.0)
   \]

---

## 3. 🔍 Execution Graph Traversal & Model Auto-Detection

The function `auto_detect_model_name` inspects the ComfyUI execution graph (`prompt` dictionary):

1. **Dynamic Checkpoint Switch Traversal:**
   - Detects `CheckpointSwitch`, `MultiCheckpointLoader`, or `ZenoCheckpointSwitch`.
   - Checks boolean toggle inputs (`enable_1`, `enable_2`, etc.) and extracts active model strings (`model_1`, `model_2`).
2. **Dedicated Model Loader Inspection:**
   - Inspects classes: `CheckpointLoaderSimple`, `CheckpointLoader`, `UNETLoader`, `DiffusionModelLoader`, `DualCLIPLoader`, `ImageOnlyCheckpointLoader`, `unCLIPCheckpointLoader`.
   - Extracts keys: `ckpt_name`, `unet_name`, `model_name`, `checkpoint`, `ckpt_filename`.
3. **Fallback Global Sweep:**
   - Sweeps remaining nodes in `prompt` containing model input keys.

---

## 4. 🔤 Filename Sanitization & Normalization Pipeline

1. **Path & Extension Stripping:** `os.path.basename` followed by removal of `.safetensors`, `.ckpt`, `.pt`, `.bin`.
2. **Digit & Special Character Filtering (Model Name):**
   - Strips all numeric digits `\d+` to retain descriptive model alpha names.
   - Replaces non-alphabetic characters with delimiters (`_`).
   - Deduplicates consecutive delimiters (`_{2,}` -> `_`).
3. **Casing Normalization:**
   - Transforms the assembled string prefix such that only index 0 is uppercase:
   \[
   S_{out} = S_{lower}[0].\text{upper}() + S_{lower}[1:]
   \]

---

## 5. 📝 Prompt Library State Serialization & Selection Algorithm

### A. Slot Data Model & JSON Schema
Prompt slots are maintained in the frontend canvas UI and serialized into a hidden widget string `slots_json`:
\[
\mathcal{S} = [s_1, s_2, \dots, s_N], \quad s_i = \{\text{id}: \text{str}, \text{title}: \text{str}, \text{prompt}: \text{str}\}
\]

### B. Selection & Validation Algorithm
Given 1-based user input index \( k \in \mathbb{Z} \) and serialized string \( \text{JSON}_{raw} \):

1. **Deserialization & Type Assertion:**
   \[
   \mathcal{S} = \text{JSON.parse}(\text{JSON}_{raw}) \quad \text{where } \mathcal{S} \text{ is asserted to be a non-empty list } (N \ge 1).
   \]
2. **Index Boundary Enforcement:**
   \[
   \text{Assert } 1 \le k \le N \implies \text{reject with actionable error if } k < 1 \lor k > N.
   \]
3. **Blank Prompt Fast-Fail:**
   Extract prompt text \( P = s_k.\text{prompt} \).
   \[
   \text{If } \text{trim}(P) = \emptyset \implies \text{raise ValueError to prevent wasteful execution with empty positive prompts.}
   \]
4. **Unicode & Formatting Invariance:**
   Returns \( P \) verbatim as a scalar Python `str`, preserving utf-8 multibyte characters (Vietnamese diacritics, Asian scripts), symbols, and newline delimiters (`\n`).

