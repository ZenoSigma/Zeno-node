import { app } from "../../scripts/app.js";

/**
 * Zeno - Prompt Library Custom Node Frontend Extension
 * Provides an interactive, multi-slot prompt management UI directly inside ComfyUI.
 * Compatible with ComfyUI 2.0 (Vue-based Nodes) and Classic (LiteGraph Canvas).
 */

function setupPromptLibraryNode(node) {
    if (!node || node.__zeno_initialized) {
        return;
    }
    node.__zeno_initialized = true;

    // 1. Locate and hide the raw slots_json storage widget
    const slotsJsonWidget = node.widgets?.find((w) => w.name === "slots_json");
    if (slotsJsonWidget) {
        slotsJsonWidget.type = "hidden";
        slotsJsonWidget.computeSize = () => [0, -4];
        if (slotsJsonWidget.element) {
            slotsJsonWidget.element.style.display = "none";
        }
    }

    // 2. Initialize slots state
    node.promptSlots = [
        { id: `slot-${Date.now()}-1`, title: "", prompt: "" }
    ];

    const syncToWidget = () => {
        const jsonStr = JSON.stringify(node.promptSlots);
        if (slotsJsonWidget) {
            slotsJsonWidget.value = jsonStr;
        }
        if (!node.properties) {
            node.properties = {};
        }
        node.properties.slots_json = jsonStr;
    };

    const parseFromWidget = () => {
        let raw = slotsJsonWidget?.value;
        if (!raw && node.properties?.slots_json) {
            raw = node.properties.slots_json;
        }
        if (!raw && Array.isArray(node.widgets_values)) {
            const candidate = node.widgets_values.find(
                (v) => typeof v === "string" && v.trim().startsWith("[")
            );
            if (candidate) raw = candidate;
        }

        if (raw) {
            try {
                const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
                if (Array.isArray(parsed) && parsed.length > 0) {
                    node.promptSlots = parsed.map((s, idx) => ({
                        id: s.id || `slot-${Date.now()}-${idx + 1}`,
                        title: s.title || "",
                        prompt: s.prompt || ""
                    }));
                }
            } catch (e) {
                console.warn("[Zeno PromptLibrary] Could not parse slots JSON:", e);
            }
        }
    };

    // 3. Build UI Container & Elements
    const container = document.createElement("div");
    container.className = "zeno-prompt-library-container";
    container.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        color: #e0e0e0;
        padding: 4px 2px;
        pointer-events: auto;
        user-select: text;
    `;

    // Isolate canvas events on the container
    container.addEventListener("pointerdown", (e) => e.stopPropagation());
    container.addEventListener("mousedown", (e) => e.stopPropagation());

    const listContainer = document.createElement("div");
    listContainer.className = "zeno-prompt-slots-list comfy-multiline-input";
    listContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 320px;
        overflow-y: auto;
        padding-right: 4px;
        box-sizing: border-box;
    `;

    // Isolate wheel / scroll events from canvas zooming
    listContainer.addEventListener("wheel", (e) => e.stopPropagation(), { passive: false });

    const getSelectedIndex = () => {
        const selWidget = node.widgets?.find((w) => w.name === "selected_index");
        const val = selWidget?.value;
        return typeof val === "number" ? val : parseInt(val || "1", 10) || 1;
    };

    const calculateDynamicHeight = () => {
        const count = node.promptSlots?.length || 1;
        return Math.max(180, Math.min(520, count * 105 + 55));
    };

    const updateNodeBounds = () => {
        const neededHeight = calculateDynamicHeight();
        const currentW = (node.size && node.size[0]) || 400;
        const currentH = (node.size && node.size[1]) || 280;
        const targetW = Math.max(currentW, 400);
        const targetH = Math.max(currentH, neededHeight + 70);

        if (node.setSize) {
            node.setSize([targetW, targetH]);
        }
        if (node.setDirtyCanvas) {
            node.setDirtyCanvas(true, true);
        }
    };

    const renderSlots = () => {
        listContainer.innerHTML = "";
        const activeIndex = getSelectedIndex();

        node.promptSlots.forEach((slot, index) => {
            const slotNumber = index + 1;
            const isActive = slotNumber === activeIndex;

            const row = document.createElement("div");
            row.className = `zeno-slot-row ${isActive ? "zeno-slot-active" : ""}`;
            row.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 5px;
                background: ${isActive ? "rgba(35, 55, 80, 0.85)" : "rgba(28, 28, 30, 0.8)"};
                border: 1px solid ${isActive ? "#38bdf8" : "rgba(255, 255, 255, 0.12)"};
                box-shadow: ${isActive ? "0 0 8px rgba(56, 189, 248, 0.25)" : "none"};
                border-radius: 6px;
                padding: 8px;
                box-sizing: border-box;
                transition: border-color 0.2s, background-color 0.2s;
            `;

            // Top bar: Index badge, Title input, Remove button
            const topBar = document.createElement("div");
            topBar.style.cssText = `
                display: flex;
                align-items: center;
                gap: 6px;
            `;

            const badge = document.createElement("span");
            badge.innerText = `[${slotNumber}]${isActive ? " ★" : ""}`;
            badge.title = isActive ? "Currently selected output slot" : `Slot ${slotNumber}`;
            badge.style.cssText = `
                font-weight: 700;
                font-size: 11px;
                color: ${isActive ? "#38bdf8" : "#94a3b8"};
                min-width: 32px;
                letter-spacing: 0.5px;
            `;

            const titleInput = document.createElement("input");
            titleInput.type = "text";
            titleInput.placeholder = "Slot title / tag (e.g., Cyberpunk, Portrait)...";
            titleInput.value = slot.title || "";
            titleInput.style.cssText = `
                flex: 1;
                background: rgba(15, 15, 18, 0.9);
                border: 1px solid ${isActive ? "rgba(56, 189, 248, 0.4)" : "#3a3a3c"};
                border-radius: 4px;
                color: #f1f5f9;
                padding: 3px 8px;
                font-size: 11px;
                outline: none;
                box-sizing: border-box;
            `;
            titleInput.addEventListener("keydown", (e) => e.stopPropagation());
            titleInput.addEventListener("input", (e) => {
                slot.title = e.target.value;
                syncToWidget();
            });

            const removeBtn = document.createElement("button");
            removeBtn.innerText = "✕";
            removeBtn.title = "Delete this slot";
            removeBtn.style.cssText = `
                background: rgba(239, 68, 68, 0.15);
                border: 1px solid rgba(239, 68, 68, 0.4);
                color: #f87171;
                border-radius: 4px;
                cursor: pointer;
                padding: 2px 7px;
                font-size: 11px;
                font-weight: bold;
                display: ${node.promptSlots.length <= 1 ? "none" : "block"};
                transition: background 0.15s;
            `;
            removeBtn.addEventListener("mouseenter", () => {
                removeBtn.style.background = "rgba(239, 68, 68, 0.35)";
            });
            removeBtn.addEventListener("mouseleave", () => {
                removeBtn.style.background = "rgba(239, 68, 68, 0.15)";
            });
            removeBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (node.promptSlots.length > 1) {
                    node.promptSlots.splice(index, 1);
                    syncToWidget();
                    renderSlots();
                    updateNodeBounds();
                }
            });

            topBar.appendChild(badge);
            topBar.appendChild(titleInput);
            topBar.appendChild(removeBtn);

            // Multiline prompt textarea
            const promptTextarea = document.createElement("textarea");
            promptTextarea.placeholder = `Enter prompt text for slot #${slotNumber}...`;
            promptTextarea.value = slot.prompt || "";
            promptTextarea.rows = 2;
            promptTextarea.style.cssText = `
                width: 100%;
                box-sizing: border-box;
                background: rgba(12, 12, 14, 0.95);
                border: 1px solid ${isActive ? "rgba(56, 189, 248, 0.35)" : "#333336"};
                border-radius: 4px;
                color: #ffffff;
                padding: 5px 8px;
                font-size: 11px;
                line-height: 1.4;
                resize: vertical;
                min-height: 48px;
                font-family: inherit;
                outline: none;
            `;
            promptTextarea.addEventListener("keydown", (e) => e.stopPropagation());
            promptTextarea.addEventListener("input", (e) => {
                slot.prompt = e.target.value;
                syncToWidget();
            });

            row.appendChild(topBar);
            row.appendChild(promptTextarea);
            listContainer.appendChild(row);
        });
    };

    // Add Slot button
    const addBtn = document.createElement("button");
    addBtn.innerText = "+ Add New Slot";
    addBtn.style.cssText = `
        width: 100%;
        background: #1e293b;
        border: 1px solid #334155;
        color: #38bdf8;
        border-radius: 5px;
        padding: 6px 10px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.3px;
        box-sizing: border-box;
        transition: all 0.2s ease;
    `;
    addBtn.addEventListener("mouseenter", () => {
        addBtn.style.background = "#2563eb";
        addBtn.style.color = "#ffffff";
        addBtn.style.borderColor = "#3b82f6";
    });
    addBtn.addEventListener("mouseleave", () => {
        addBtn.style.background = "#1e293b";
        addBtn.style.color = "#38bdf8";
        addBtn.style.borderColor = "#334155";
    });
    addBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        node.promptSlots.push({
            id: `slot-${Date.now()}-${node.promptSlots.length + 1}`,
            title: "",
            prompt: ""
        });
        syncToWidget();
        renderSlots();
        updateNodeBounds();
    });

    container.appendChild(listContainer);
    container.appendChild(addBtn);

    // 4. Attach DOM widget to node with ComfyUI 2.0 & classic options
    let domWidget = null;
    if (node.addDOMWidget) {
        domWidget = node.addDOMWidget("zeno_prompt_library_ui", "custom", container, {
            getValue() {
                return node.promptSlots;
            },
            setValue(val) {
                if (val) {
                    node.promptSlots = Array.isArray(val) ? val : [val];
                    renderSlots();
                    syncToWidget();
                }
            },
            getMinHeight() {
                return calculateDynamicHeight();
            },
            getHeight() {
                return calculateDynamicHeight();
            },
            onResize() {
                renderSlots();
            }
        });

        if (domWidget) {
            domWidget.computeSize = (width) => {
                return [width || 400, calculateDynamicHeight()];
            };
        }
    }

    // 5. Reactive highlight when selected_index changes
    const selectedIndexWidget = node.widgets?.find((w) => w.name === "selected_index");
    if (selectedIndexWidget) {
        const origCallback = selectedIndexWidget.callback;
        selectedIndexWidget.callback = function (val) {
            const res = origCallback ? origCallback.apply(this, arguments) : undefined;
            renderSlots();
            return res;
        };
    }

    // 6. External refresh hook
    node.__zeno_refresh_slots = () => {
        parseFromWidget();
        renderSlots();
        syncToWidget();
        updateNodeBounds();
    };

    // Initial render & sync
    parseFromWidget();
    renderSlots();
    syncToWidget();
    updateNodeBounds();
}

app.registerExtension({
    name: "Zeno.PromptLibrary",

    // ComfyUI 2.0 (Vue nodes) lifecycle hook
    async nodeCreated(node) {
        if (node.comfyClass === "PromptLibrary" || node.type === "PromptLibrary") {
            setupPromptLibraryNode(node);
        }
    },

    // Classic LiteGraph lifecycle & prototype hook
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "PromptLibrary") {
            return;
        }

        const origOnNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const r = origOnNodeCreated ? origOnNodeCreated.apply(this, arguments) : undefined;
            setupPromptLibraryNode(this);
            return r;
        };

        const origOnConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function () {
            const r = origOnConfigure ? origOnConfigure.apply(this, arguments) : undefined;
            if (this.__zeno_refresh_slots) {
                this.__zeno_refresh_slots();
            }
            return r;
        };
    }
});

