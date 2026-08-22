import { app } from "../../scripts/app.js";

/**
 * Zeno - Prompt Library Custom Node Frontend Extension
 * Provides an interactive UI for managing multiple prompt slots directly inside ComfyUI.
 */

app.registerExtension({
    name: "Zeno.PromptLibrary",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "PromptLibrary") {
            return;
        }

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;

            // 1. Hide the raw JSON widget
            const slotsJsonWidget = this.widgets?.find((w) => w.name === "slots_json");
            if (slotsJsonWidget) {
                slotsJsonWidget.type = "hidden";
                slotsJsonWidget.computeSize = () => [0, -4];
            }

            // 2. Initialize slots state
            this.promptSlots = [
                { id: "slot-" + Date.now() + "-1", title: "", prompt: "" }
            ];

            const self = this;

            const syncToWidget = () => {
                if (slotsJsonWidget) {
                    slotsJsonWidget.value = JSON.stringify(self.promptSlots);
                }
            };

            const parseFromWidget = () => {
                if (slotsJsonWidget && slotsJsonWidget.value) {
                    try {
                        const parsed = typeof slotsJsonWidget.value === "string"
                            ? JSON.parse(slotsJsonWidget.value)
                            : slotsJsonWidget.value;
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            self.promptSlots = parsed.map((s, idx) => ({
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

            // 3. Build UI Container
            const container = document.createElement("div");
            container.className = "zeno-prompt-library-container";
            container.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 8px;
                width: 100%;
                box-sizing: border-box;
                font-family: sans-serif;
                font-size: 12px;
                color: #ddd;
                padding: 4px 0;
            `;

            const listContainer = document.createElement("div");
            listContainer.className = "zeno-prompt-slots-list";
            listContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 6px;
                max-height: 280px;
                overflow-y: auto;
                padding-right: 4px;
            `;

            const renderSlots = () => {
                listContainer.innerHTML = "";

                self.promptSlots.forEach((slot, index) => {
                    const row = document.createElement("div");
                    row.className = "zeno-slot-row";
                    row.style.cssText = `
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                        background: rgba(30, 30, 30, 0.7);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 4px;
                        padding: 6px;
                    `;

                    // Top row: Index badge, Title input, Remove button
                    const topBar = document.createElement("div");
                    topBar.style.cssText = `
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    `;

                    const badge = document.createElement("span");
                    badge.innerText = `[${index + 1}]`;
                    badge.style.cssText = `
                        font-weight: bold;
                        color: #4da6ff;
                        min-width: 24px;
                    `;

                    const titleInput = document.createElement("input");
                    titleInput.type = "text";
                    titleInput.placeholder = "Slot title / tag...";
                    titleInput.value = slot.title || "";
                    titleInput.style.cssText = `
                        flex: 1;
                        background: #111;
                        border: 1px solid #444;
                        border-radius: 3px;
                        color: #eee;
                        padding: 2px 6px;
                        font-size: 11px;
                    `;
                    titleInput.addEventListener("input", (e) => {
                        slot.title = e.target.value;
                        syncToWidget();
                    });

                    const removeBtn = document.createElement("button");
                    removeBtn.innerText = "✕";
                    removeBtn.title = "Remove this slot";
                    removeBtn.style.cssText = `
                        background: #442222;
                        border: 1px solid #663333;
                        color: #ff8888;
                        border-radius: 3px;
                        cursor: pointer;
                        padding: 2px 6px;
                        font-size: 11px;
                        display: ${self.promptSlots.length <= 1 ? "none" : "block"};
                    `;
                    removeBtn.addEventListener("click", (e) => {
                        e.preventDefault();
                        if (self.promptSlots.length > 1) {
                            self.promptSlots.splice(index, 1);
                            syncToWidget();
                            renderSlots();
                        }
                    });

                    topBar.appendChild(badge);
                    topBar.appendChild(titleInput);
                    topBar.appendChild(removeBtn);

                    // Bottom row: Multiline prompt textarea
                    const promptTextarea = document.createElement("textarea");
                    promptTextarea.placeholder = "Enter prompt text here...";
                    promptTextarea.value = slot.prompt || "";
                    promptTextarea.rows = 2;
                    promptTextarea.style.cssText = `
                        width: 100%;
                        box-sizing: border-box;
                        background: #181818;
                        border: 1px solid #333;
                        border-radius: 3px;
                        color: #fff;
                        padding: 4px 6px;
                        font-size: 11px;
                        resize: vertical;
                        font-family: inherit;
                    `;
                    promptTextarea.addEventListener("input", (e) => {
                        slot.prompt = e.target.value;
                        syncToWidget();
                    });

                    row.appendChild(topBar);
                    row.appendChild(promptTextarea);
                    listContainer.appendChild(row);
                });
            };

            const addBtn = document.createElement("button");
            addBtn.innerText = "+ Add Slot";
            addBtn.style.cssText = `
                width: 100%;
                background: #2a3a4a;
                border: 1px solid #3a5a7a;
                color: #88c0d0;
                border-radius: 4px;
                padding: 5px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                transition: background 0.2s;
            `;
            addBtn.addEventListener("mouseenter", () => {
                addBtn.style.background = "#3a4a5a";
            });
            addBtn.addEventListener("mouseleave", () => {
                addBtn.style.background = "#2a3a4a";
            });
            addBtn.addEventListener("click", (e) => {
                e.preventDefault();
                self.promptSlots.push({
                    id: "slot-" + Date.now() + "-" + (self.promptSlots.length + 1),
                    title: "",
                    prompt: ""
                });
                syncToWidget();
                renderSlots();
            });

            container.appendChild(listContainer);
            container.appendChild(addBtn);

            // 4. Attach DOM widget to node
            if (this.addDOMWidget) {
                this.addDOMWidget("zeno_prompt_library_ui", "custom", container, {
                    getValue() {
                        return self.promptSlots;
                    },
                    setValue(val) {
                        if (val) {
                            self.promptSlots = val;
                            renderSlots();
                            syncToWidget();
                        }
                    }
                });
            }

            // Hook onConfigure to restore slots from saved workflow
            const origOnConfigure = this.onConfigure;
            this.onConfigure = function () {
                const res = origOnConfigure ? origOnConfigure.apply(this, arguments) : undefined;
                parseFromWidget();
                renderSlots();
                return res;
            };

            // Initial render
            parseFromWidget();
            renderSlots();
            syncToWidget();

            // Adjust default size if needed
            const currentSize = this.size || [350, 200];
            if (currentSize[0] < 380) {
                this.setSize([380, Math.max(currentSize[1], 260)]);
            }

            return r;
        };
    }
});
