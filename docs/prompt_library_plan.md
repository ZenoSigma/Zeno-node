# Zeno Prompt Library - MVP Plan

**Status:** Implemented & Verified (Production Ready)
**Scope:** Zeno-node / ComfyUI custom node pack

## 1. Objective

Add a lightweight node for storing several reusable text prompts directly in a
ComfyUI workflow and outputting exactly one selected prompt as a `STRING`.

The node is designed for quickly switching a workflow between saved prompts
without copying text between external files or repeatedly editing a CLIP text
widget.

## 2. Locked MVP Scope

### Included

- Store one or more prompt slots inside the workflow.
- Each slot has a display-only title and a multiline prompt body.
- Start with one empty slot by default.
- Add new slots with an `Add slot` control.
- Remove slots while keeping at least one slot available.
- Show a one-based `Prompt number` input.
- Output the prompt body from the selected slot as one normal `STRING` value.
- Preserve slot order, titles, and prompt text when saving, reloading, copying,
  or cloning a workflow.

### Explicitly excluded

- `OUTPUT_IS_LIST` / prompt-list output.
- Re-running or looping a workflow for every saved prompt.
- Queue management, automatic job submission, or a Run button inside the node.
- Dynamic graph expansion and loop-control nodes.
- Outputting slot titles or concatenating titles with prompt text.

The normal ComfyUI Queue/Run action remains the only way to execute the
workflow. It runs once using the prompt selected by `Prompt number`.

## 3. User Interface

```text
Prompt number: [ 2 ]

[1] [Portrait          ] [portrait photo, soft light ...        ] [Remove]
[2] [Landscape         ] [mountain landscape, sunrise ...       ] [Remove]

                                               [+ Add slot]
```

UI rules:

- The index badge is generated from slot order and is not manually editable.
- The title is a single-line organizer field on the left.
- The prompt is a multiline text field on the right.
- The prompt field is the only text emitted by the output socket.
- The first/only remaining slot cannot be removed.
- Removing a slot renumbers later slots continuously.
- The list area must remain usable with many slots, preferably with a bounded
  scroll area rather than unlimited node height.
- `Prompt number` is one-based: `1` selects the first slot.

## 4. Node Contract

### Proposed identity

| Field | Value |
| --- | --- |
| Class | `PromptLibrary` |
| Display name | `Zeno - Prompt Library` |
| Category | `Zeno/Text` |
| Function | `get_prompt` |

### Inputs

| Input | Type | Purpose |
| --- | --- | --- |
| `selected_index` | `INT` | One-based slot number chosen by the user. |
| `slots_json` | hidden `STRING` | Serialized prompt slots maintained by the frontend widget. |

`slots_json` is an implementation detail and must not be exposed as an
unfriendly JSON editor in the normal node UI.

### Output

| Output | Type | Behaviour |
| --- | --- | --- |
| `prompt` | `STRING` | The prompt body in slot `selected_index`. |

There is no list output in this version.

## 5. Persistent Slot Data

The frontend stores the widget value as JSON in the workflow. Each row has a
stable ID so frontend state remains reliable after rows are added or removed.

```json
[
  {
    "id": "slot-uuid-or-stable-id",
    "title": "Portrait",
    "prompt": "portrait photo, soft light"
  }
]
```

The backend treats titles as metadata only. It reads and returns only
`prompt`.

## 6. Validation and Error Behaviour

- Reject malformed or non-list slot data with a clear node error.
- Reject `selected_index < 1`.
- Reject an index greater than the number of stored slots.
- Reject a selected slot whose prompt body is blank, preventing an accidental
  expensive generation with an empty positive prompt.
- Preserve prompt text exactly, including Unicode, Vietnamese, punctuation,
  and line breaks.
- Never silently clamp an invalid index to another prompt.

## 7. Planned Implementation Shape

| Area | Planned change |
| --- | --- |
| Backend | Add `nodes/prompt_library_node.py` with parsing, validation, and scalar `STRING` output. |
| Registration | Export the new class and display name from root `__init__.py`. |
| Frontend | Add a small ComfyUI web extension for the dynamic slot rows and hidden JSON synchronization. |
| Package | Declare `WEB_DIRECTORY` only when the frontend extension is added. |
| Tests | Add focused unit tests for JSON validation, selection, blank prompts, and Unicode preservation. |
| Documentation | Update API and architecture docs after the implementation contract is finalized in code. |

## 8. Acceptance Criteria

1. A newly added node displays one empty prompt slot.
2. Adding slots persists every title and prompt after workflow reload.
3. Selecting slot `N` outputs only that slot's prompt body.
4. Titles never appear in the `STRING` output.
5. Invalid indices and blank selected prompts show actionable errors.
6. Existing Zeno-node mappings and workflows remain unchanged.
7. Existing tests and new prompt-library tests pass.
8. No list processing, queueing, loop execution, or custom Run action is
   introduced.

## 9. Deferred Follow-up

If batch prompt execution becomes necessary later, design it as a separate
workflow-control feature. It must not be added implicitly to this storage node,
because list processing, end-to-end sequential execution, and job queueing have
different execution semantics in ComfyUI.
