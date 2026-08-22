import json
import logging

logger = logging.getLogger("ZenoNode")

DEFAULT_SLOTS_JSON = '[{"id": "slot-1", "title": "", "prompt": ""}]'


class PromptLibrary:
    """
    Zeno Prompt Library Node
    Stores multiple reusable prompt slots within the workflow and outputs
    exactly one selected prompt as a STRING value.
    """

    DESCRIPTION = (
        "Stores multiple reusable prompt slots directly inside the workflow and "
        "outputs the selected prompt as a STRING. Simplifies switching between prompts "
        "without modifying CLIP text widgets or external files."
    )

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "selected_index": ("INT", {
                    "default": 1,
                    "min": 1,
                    "max": 9999,
                    "step": 1,
                    "tooltip": "One-based slot number (Prompt number) to output."
                }),
            },
            "optional": {
                "slots_json": ("STRING", {
                    "default": DEFAULT_SLOTS_JSON,
                    "multiline": True,
                })
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("prompt",)
    OUTPUT_TOOLTIPS = ("The prompt body in the selected slot.",)
    FUNCTION = "get_prompt"
    CATEGORY = "Zeno/Text"

    @classmethod
    def VALIDATE_INPUTS(cls, **kwargs):
        return True

    def get_prompt(self, selected_index: int, slots_json: str = DEFAULT_SLOTS_JSON):
        # 1. Parse and validate slot data
        if slots_json is None or not str(slots_json).strip():
            slots_json = DEFAULT_SLOTS_JSON

        try:
            if isinstance(slots_json, str):
                slots = json.loads(slots_json)
            elif isinstance(slots_json, list):
                slots = slots_json
            else:
                raise ValueError(f"Unexpected slots_json data type: {type(slots_json).__name__}")
        except Exception as e:
            raise ValueError(f"[Zeno PromptLibrary] Failed to parse slot JSON data: {e}") from e

        if not isinstance(slots, list):
            raise ValueError("[Zeno PromptLibrary] Invalid slot format: Expected a JSON array/list of slots.")

        if len(slots) == 0:
            raise ValueError("[Zeno PromptLibrary] No prompt slots available in this node.")

        # 2. Validate one-based index
        if not isinstance(selected_index, int) or selected_index < 1:
            raise ValueError(f"[Zeno PromptLibrary] Selected prompt index ({selected_index}) must be an integer >= 1.")

        if selected_index > len(slots):
            raise ValueError(
                f"[Zeno PromptLibrary] Selected prompt index ({selected_index}) exceeds total available slots ({len(slots)}). "
                f"Please choose an index between 1 and {len(slots)}."
            )

        # 3. Retrieve target slot
        target_slot = slots[selected_index - 1]
        if isinstance(target_slot, dict):
            prompt_content = target_slot.get("prompt", "")
        elif isinstance(target_slot, str):
            prompt_content = target_slot
        else:
            raise ValueError(
                f"[Zeno PromptLibrary] Slot #{selected_index} has invalid format: {type(target_slot).__name__}"
            )

        # 4. Reject blank prompt
        if prompt_content is None or not str(prompt_content).strip():
            raise ValueError(
                f"[Zeno PromptLibrary] Selected slot #{selected_index} is empty. "
                "Please enter a prompt before running the workflow."
            )

        return (str(prompt_content),)
