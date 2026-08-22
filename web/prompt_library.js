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

    // Ensure LiteGraph positions widgets from top downwards starting right under header
    node.widgets_up = true;
    node.widgets_start_y = 35;

    // 1. Locate and hide raw storage widgets (slots_json and selected_index)
    const slotsJsonWidget = node.widgets?.find((w) => w.name === "slots_json");
    if (slotsJsonWidget) {
        slotsJsonWidget.type = "hidden";
        slotsJsonWidget.computeSize = () => [0, -4];
        slotsJsonWidget.draw = () => {};
        if (slotsJsonWidget.element) {
            slotsJsonWidget.element.style.display = "none";
            slotsJsonWidget.element.style.height = "0px";
            slotsJsonWidget.element.style.margin = "0px";
            slotsJsonWidget.element.style.padding = "0px";
        }
    }

    const selectedIndexWidget = node.widgets?.find((w) => w.name === "selected_index");
    if (selectedIndexWidget) {
        selectedIndexWidget.type = "hidden";
        selectedIndexWidget.computeSize = () => [0, -4];
        selectedIndexWidget.draw = () => {};
        if (selectedIndexWidget.element) {
            selectedIndexWidget.element.style.display = "none";
            selectedIndexWidget.element.style.height = "0px";
            selectedIndexWidget.element.style.margin = "0px";
            selectedIndexWidget.element.style.padding = "0px";
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

    const getSelectedIndex = () => {
        let val = selectedIndexWidget?.value;
        if (val === undefined && node.properties?.selected_index !== undefined) {
            val = node.properties.selected_index;
        }
        return typeof val === "number" ? val : parseInt(val || "1", 10) || 1;
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
                        prompt: s.prompt || "",
                        height: (typeof s.height === "number" && s.height > 30) ? s.height : undefined,
                        savedHeight: (typeof s.savedHeight === "number" && s.savedHeight > 30) ? s.savedHeight : undefined,
                        isExpanded: Boolean(s.isExpanded)
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
        height: 100%;
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        color: #e0e0e0;
        padding: 0px 2px;
        margin: 0;
        pointer-events: auto;
        user-select: text;
    `;

    container.setAttribute("data-capture-wheel", "true");

    // Isolate canvas events on the container (capture phase to block ComfyUI/LiteGraph canvas zoom)
    container.addEventListener("pointerdown", (e) => e.stopPropagation(), { capture: true });
    container.addEventListener("mousedown", (e) => e.stopPropagation(), { capture: true });

    // Top Toolbar: Compact Selected Index Selector & Fit Button
    const toolbar = document.createElement("div");
    toolbar.className = "zeno-prompt-toolbar";
    toolbar.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        background: rgba(20, 24, 33, 0.75);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        padding: 5px 8px;
        box-sizing: border-box;
        flex-shrink: 0;
    `;

    const indexGroup = document.createElement("div");
    indexGroup.style.cssText = `
        display: flex;
        align-items: center;
        gap: 5px;
    `;

    const indexLabel = document.createElement("span");
    indexLabel.innerText = "Selected Slot:";
    indexLabel.style.cssText = `
        font-weight: 600;
        font-size: 11px;
        color: #94a3b8;
        letter-spacing: 0.3px;
    `;

    const decBtn = document.createElement("button");
    decBtn.innerText = "−";
    decBtn.title = "Previous slot";
    decBtn.style.cssText = `
        background: #1e293b;
        border: 1px solid #334155;
        color: #f1f5f9;
        border-radius: 4px;
        cursor: pointer;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: bold;
        line-height: 1;
        padding: 0;
        transition: all 0.15s ease;
    `;
    decBtn.addEventListener("mouseenter", () => {
        decBtn.style.background = "#2563eb";
        decBtn.style.borderColor = "#3b82f6";
    });
    decBtn.addEventListener("mouseleave", () => {
        decBtn.style.background = "#1e293b";
        decBtn.style.borderColor = "#334155";
    });

    const indexInput = document.createElement("input");
    indexInput.type = "number";
    indexInput.min = "1";
    indexInput.value = getSelectedIndex();
    indexInput.setAttribute("data-capture-wheel", "true");
    indexInput.style.cssText = `
        width: 42px;
        height: 22px;
        background: #0f172a;
        border: 1px solid #38bdf8;
        border-radius: 4px;
        color: #38bdf8;
        font-size: 12px;
        font-weight: 700;
        text-align: center;
        outline: none;
        box-sizing: border-box;
        padding: 0 2px;
        -moz-appearance: textfield;
    `;
    indexInput.addEventListener("keydown", (e) => e.stopPropagation());
    indexInput.addEventListener("wheel", (e) => e.stopPropagation(), { passive: false });

    const incBtn = document.createElement("button");
    incBtn.innerText = "+";
    incBtn.title = "Next slot";
    incBtn.style.cssText = `
        background: #1e293b;
        border: 1px solid #334155;
        color: #f1f5f9;
        border-radius: 4px;
        cursor: pointer;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: bold;
        line-height: 1;
        padding: 0;
        transition: all 0.15s ease;
    `;
    incBtn.addEventListener("mouseenter", () => {
        incBtn.style.background = "#2563eb";
        incBtn.style.borderColor = "#3b82f6";
    });
    incBtn.addEventListener("mouseleave", () => {
        incBtn.style.background = "#1e293b";
        incBtn.style.borderColor = "#334155";
    });

    const countBadge = document.createElement("span");
    countBadge.innerText = `/ ${node.promptSlots?.length || 1}`;
    countBadge.style.cssText = `
        font-size: 11px;
        color: #64748b;
        font-weight: 500;
    `;

    const setIndexValue = (val) => {
        const total = node.promptSlots?.length || 1;
        const clamped = Math.max(1, Math.min(total, parseInt(val, 10) || 1));
        indexInput.value = clamped;
        if (selectedIndexWidget) {
            selectedIndexWidget.value = clamped;
            if (selectedIndexWidget.callback) {
                selectedIndexWidget.callback(clamped);
            }
        }
        if (!node.properties) node.properties = {};
        node.properties.selected_index = clamped;
        updateActiveSlotHighlight();
    };

    decBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIndexValue(getSelectedIndex() - 1);
    });

    incBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIndexValue(getSelectedIndex() + 1);
    });

    indexInput.addEventListener("change", (e) => {
        setIndexValue(e.target.value);
    });

    indexGroup.appendChild(indexLabel);
    indexGroup.appendChild(decBtn);
    indexGroup.appendChild(indexInput);
    indexGroup.appendChild(incBtn);
    indexGroup.appendChild(countBadge);

    // Fit Button (Fits node size to current slots without resetting any slot sizes)
    const fitBtn = document.createElement("button");
    fitBtn.innerText = "⛶ Fit Size";
    fitBtn.title = "Tự động căn chỉnh kích thước node vừa khít các ô prompt hiện tại (không reset kích thước các ô)";
    fitBtn.style.cssText = `
        background: rgba(56, 189, 248, 0.12);
        border: 1px solid rgba(56, 189, 248, 0.35);
        color: #38bdf8;
        border-radius: 4px;
        cursor: pointer;
        padding: 3px 8px;
        font-size: 11px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.15s ease;
        line-height: 1;
    `;
    fitBtn.addEventListener("mouseenter", () => {
        fitBtn.style.background = "#0284c7";
        fitBtn.style.borderColor = "#38bdf8";
        fitBtn.style.color = "#ffffff";
    });
    fitBtn.addEventListener("mouseleave", () => {
        fitBtn.style.background = "rgba(56, 189, 248, 0.12)";
        fitBtn.style.borderColor = "rgba(56, 189, 248, 0.35)";
        fitBtn.style.color = "#38bdf8";
    });

    const fitNodeToContent = () => {
        // Read actual current DOM heights of each textarea without resetting anything!
        const existingTextareas = listContainer.querySelectorAll("textarea");
        existingTextareas.forEach((ta, idx) => {
            if (node.promptSlots[idx] && ta.offsetHeight > 35) {
                node.promptSlots[idx].height = ta.offsetHeight;
            }
        });

        let totalSlotsHeight = 0;
        const rows = listContainer.querySelectorAll(".zeno-slot-row");
        if (rows.length > 0) {
            rows.forEach((row, idx) => {
                const ta = row.querySelector("textarea");
                const taHeight = (ta && ta.offsetHeight > 35) ? ta.offsetHeight : ((node.promptSlots[idx]?.height) || 50);
                totalSlotsHeight += (taHeight + 48);
            });
            totalSlotsHeight += (rows.length - 1) * 8;
        } else {
            totalSlotsHeight = 60;
        }

        const totalNeededHeight = 35 + 34 + 6 + totalSlotsHeight + 6 + 32 + 8;
        const currentW = (node.size && node.size[0]) || 400;
        const targetW = Math.max(400, currentW);
        const targetH = Math.max(180, totalNeededHeight);

        if (node.setSize) {
            node.setSize([targetW, targetH]);
        }
        updateDynamicLayout([targetW, targetH]);
        if (node.setDirtyCanvas) {
            node.setDirtyCanvas(true, true);
        }
    };

    fitBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        fitNodeToContent();
    });

    toolbar.appendChild(indexGroup);
    toolbar.appendChild(fitBtn);

    const listContainer = document.createElement("div");
    listContainer.className = "zeno-prompt-slots-list";
    listContainer.setAttribute("data-capture-wheel", "true");
    listContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1 1 0;
        min-height: 0;
        overflow-y: auto;
        padding-right: 4px;
        box-sizing: border-box;
    `;

    // Isolate wheel / scroll events from canvas zooming
    container.addEventListener("wheel", (e) => {
        e.stopPropagation();
        e.preventDefault();
        listContainer.scrollTop += e.deltaY;
    }, { capture: true, passive: false });

    listContainer.addEventListener("wheel", (e) => {
        e.stopPropagation();
        e.preventDefault();
        listContainer.scrollTop += e.deltaY;
    }, { capture: true, passive: false });

    const calculateDynamicHeight = () => {
        if (!node.promptSlots || node.promptSlots.length === 0) return 140;
        let total = 34 + 6 + 40; // toolbar (~34px) + gap (6px) + add button (32px) + padding
        node.promptSlots.forEach((s) => {
            const h = (typeof s.height === "number" && s.height > 30) ? s.height : 50;
            total += h + 54; // topBar + gap + textarea + padding + row gap
        });
        return Math.max(140, total);
    };

    const updateDynamicLayout = (size) => {
        const currentH = (size && size[1]) || (node.size && node.size[1]) || 280;
        const availableH = Math.max(100, currentH - 38);
        if (domWidget && domWidget.element) {
            domWidget.element.style.height = `${availableH}px`;
        }
    };

    const updateNodeBounds = () => {
        const neededHeight = calculateDynamicHeight();
        const currentW = (node.size && node.size[0]) || 400;
        const currentH = (node.size && node.size[1]) || 280;
        const targetW = Math.max(currentW, 400);
        const targetH = Math.max(currentH, neededHeight + 38);

        if (node.setSize) {
            node.setSize([targetW, targetH]);
        }
        updateDynamicLayout([targetW, targetH]);
        if (node.setDirtyCanvas) {
            node.setDirtyCanvas(true, true);
        }
    };

    const renderSlots = () => {
        // Save current DOM heights of any active textareas before clearing
        const existingTextareas = listContainer.querySelectorAll("textarea");
        existingTextareas.forEach((ta, idx) => {
            if (node.promptSlots[idx] && ta.offsetHeight > 35) {
                node.promptSlots[idx].height = ta.offsetHeight;
            }
        });

        listContainer.innerHTML = "";
        const activeIndex = getSelectedIndex();

        if (countBadge) {
            countBadge.innerText = `/ ${node.promptSlots?.length || 1}`;
        }
        if (indexInput) {
            indexInput.value = activeIndex;
        }

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
            row.setAttribute("data-capture-wheel", "true");
            row.addEventListener("wheel", (e) => {
                e.stopPropagation();
                e.preventDefault();
                listContainer.scrollTop += e.deltaY;
            }, { capture: true, passive: false });

            // Top bar: Index badge, Title input, Expand/Collapse button, Remove button
            const topBar = document.createElement("div");
            topBar.style.cssText = `
                display: flex;
                align-items: center;
                gap: 6px;
            `;

            const badge = document.createElement("span");
            badge.className = "zeno-slot-badge";
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
            titleInput.setAttribute("data-capture-wheel", "true");
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
            titleInput.addEventListener("wheel", (e) => {
                e.stopPropagation();
                e.preventDefault();
                listContainer.scrollTop += e.deltaY;
            }, { capture: true, passive: false });
            titleInput.addEventListener("input", (e) => {
                slot.title = e.target.value;
                syncToWidget();
            });

            // Expand / Collapse button
            const expandBtn = document.createElement("button");
            const updateExpandBtnVisual = () => {
                if (slot.isExpanded) {
                    expandBtn.innerText = "⤡";
                    expandBtn.title = "Thu gọn ô prompt (Collapse slot)";
                    expandBtn.style.background = "rgba(56, 189, 248, 0.25)";
                    expandBtn.style.borderColor = "rgba(56, 189, 248, 0.5)";
                    expandBtn.style.color = "#38bdf8";
                } else {
                    expandBtn.innerText = "⤢";
                    expandBtn.title = "Mở rộng theo chiều dọc để xem hết nội dung (Expand slot vertically)";
                    expandBtn.style.background = "rgba(255, 255, 255, 0.08)";
                    expandBtn.style.borderColor = "rgba(255, 255, 255, 0.2)";
                    expandBtn.style.color = "#94a3b8";
                }
            };

            expandBtn.style.cssText = `
                border-radius: 4px;
                cursor: pointer;
                padding: 2px 7px;
                font-size: 11px;
                font-weight: bold;
                transition: all 0.15s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                line-height: 1;
            `;
            updateExpandBtnVisual();

            expandBtn.addEventListener("mouseenter", () => {
                expandBtn.style.background = slot.isExpanded ? "rgba(56, 189, 248, 0.45)" : "rgba(255, 255, 255, 0.2)";
                expandBtn.style.color = "#ffffff";
            });
            expandBtn.addEventListener("mouseleave", () => {
                updateExpandBtnVisual();
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
            topBar.appendChild(expandBtn);
            topBar.appendChild(removeBtn);

            // Multiline prompt textarea
            const promptTextarea = document.createElement("textarea");
            promptTextarea.placeholder = `Enter prompt text for slot #${slotNumber}...`;
            promptTextarea.value = slot.prompt || "";
            promptTextarea.rows = 2;
            promptTextarea.setAttribute("data-capture-wheel", "true");
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
            if (typeof slot.height === "number" && slot.height > 30) {
                promptTextarea.style.height = `${slot.height}px`;
            }

            // Expand / Collapse button click logic
            expandBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (!slot.isExpanded) {
                    // Save current height before expanding
                    slot.savedHeight = slot.height || promptTextarea.offsetHeight || 50;
                    slot.isExpanded = true;
                    // Auto-calculate scrollHeight to fit all content vertically
                    promptTextarea.style.height = "auto";
                    const fitHeight = Math.max(50, promptTextarea.scrollHeight + 6);
                    promptTextarea.style.height = `${fitHeight}px`;
                    slot.height = fitHeight;
                } else {
                    // Collapse back to saved height or compact default
                    slot.isExpanded = false;
                    const collapseH = slot.savedHeight || 50;
                    slot.height = collapseH;
                    promptTextarea.style.height = `${collapseH}px`;
                }

                updateExpandBtnVisual();
                syncToWidget();
                updateNodeBounds();
            });

            // Prevent wheel events inside textarea from zooming canvas (capture phase)
            promptTextarea.addEventListener("wheel", (e) => {
                e.stopPropagation();
                e.preventDefault();
                const maxScroll = promptTextarea.scrollHeight - promptTextarea.clientHeight;
                if (maxScroll > 1) {
                    const canScrollDown = e.deltaY > 0 && promptTextarea.scrollTop < maxScroll - 0.5;
                    const canScrollUp = e.deltaY < 0 && promptTextarea.scrollTop > 0.5;
                    if (canScrollDown || canScrollUp) {
                        promptTextarea.scrollTop += e.deltaY;
                        return;
                    }
                }
                listContainer.scrollTop += e.deltaY;
            }, { capture: true, passive: false });

            // Isolate pointerdown/mousedown inside textarea
            promptTextarea.addEventListener("mousedown", (e) => e.stopPropagation());
            promptTextarea.addEventListener("pointerdown", (e) => e.stopPropagation());
            promptTextarea.addEventListener("keydown", (e) => e.stopPropagation());

            promptTextarea.addEventListener("input", (e) => {
                slot.prompt = e.target.value;
                if (slot.isExpanded) {
                    promptTextarea.style.height = "auto";
                    const fitHeight = Math.max(50, promptTextarea.scrollHeight + 6);
                    promptTextarea.style.height = `${fitHeight}px`;
                    slot.height = fitHeight;
                    updateNodeBounds();
                }
                syncToWidget();
            });

            // Capture manual resize of textarea by user dragging handle
            promptTextarea.addEventListener("mouseup", () => {
                const currentH = promptTextarea.offsetHeight;
                if (currentH > 35 && currentH !== slot.height) {
                    slot.height = currentH;
                    slot.savedHeight = currentH;
                    slot.isExpanded = false;
                    updateExpandBtnVisual();
                    syncToWidget();
                    updateNodeBounds();
                }
            });

            if (window.ResizeObserver) {
                let initialized = false;
                const ro = new ResizeObserver(() => {
                    if (!initialized) {
                        initialized = true;
                        return;
                    }
                    const currentH = promptTextarea.offsetHeight;
                    if (currentH > 35 && currentH !== slot.height) {
                        slot.height = currentH;
                        slot.savedHeight = currentH;
                        syncToWidget();
                    }
                });
                ro.observe(promptTextarea);
            }

            row.appendChild(topBar);
            row.appendChild(promptTextarea);
            listContainer.appendChild(row);
        });

        updateDynamicLayout();
    };

    const updateActiveSlotHighlight = () => {
        const activeIndex = getSelectedIndex();
        if (indexInput && indexInput.value != activeIndex) {
            indexInput.value = activeIndex;
        }
        if (countBadge) {
            countBadge.innerText = `/ ${node.promptSlots?.length || 1}`;
        }
        const rows = listContainer.querySelectorAll(".zeno-slot-row");
        if (rows.length !== (node.promptSlots?.length || 0)) {
            renderSlots();
            return;
        }
        rows.forEach((row, idx) => {
            const slotNumber = idx + 1;
            const isActive = slotNumber === activeIndex;

            if (isActive) {
                row.classList.add("zeno-slot-active");
            } else {
                row.classList.remove("zeno-slot-active");
            }
            row.style.background = isActive ? "rgba(35, 55, 80, 0.85)" : "rgba(28, 28, 30, 0.8)";
            row.style.borderColor = isActive ? "#38bdf8" : "rgba(255, 255, 255, 0.12)";
            row.style.boxShadow = isActive ? "0 0 8px rgba(56, 189, 248, 0.25)" : "none";

            const badge = row.querySelector(".zeno-slot-badge");
            if (badge) {
                badge.innerText = `[${slotNumber}]${isActive ? " ★" : ""}`;
                badge.title = isActive ? "Currently selected output slot" : `Slot ${slotNumber}`;
                badge.style.color = isActive ? "#38bdf8" : "#94a3b8";
            }

            const titleInput = row.querySelector("input");
            if (titleInput) {
                titleInput.style.borderColor = isActive ? "rgba(56, 189, 248, 0.4)" : "#3a3a3c";
            }

            const textarea = row.querySelector("textarea");
            if (textarea) {
                textarea.style.borderColor = isActive ? "rgba(56, 189, 248, 0.35)" : "#333336";
            }
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
        flex-shrink: 0;
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

    container.appendChild(toolbar);
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
                const currentH = (node.size && node.size[1]) || (calculateDynamicHeight() + 38);
                return Math.max(120, currentH - 38);
            },
            onResize(size) {
                updateDynamicLayout(size);
            }
        });

        if (domWidget) {
            // Shift domWidget to front of widgets array so no hidden widgets push it down
            const wIdx = node.widgets.indexOf(domWidget);
            if (wIdx > 0) {
                node.widgets.splice(wIdx, 1);
                node.widgets.unshift(domWidget);
            }
            domWidget.computeSize = (width) => {
                const currentH = (node.size && node.size[1]) || (calculateDynamicHeight() + 38);
                return [width || 400, Math.max(120, currentH - 38)];
            };
        }
    }

    // 5. Hook onResize on instance for instant layout updates
    const origOnResize = node.onResize;
    node.onResize = function (size) {
        const res = origOnResize ? origOnResize.apply(this, arguments) : undefined;
        updateDynamicLayout(size);
        return res;
    };

    // 6. Reactive highlight when selected_index changes
    if (selectedIndexWidget) {
        const origCallback = selectedIndexWidget.callback;
        selectedIndexWidget.callback = function (val) {
            const res = origCallback ? origCallback.apply(this, arguments) : undefined;
            updateActiveSlotHighlight();
            return res;
        };
    }

    // 7. External refresh hook
    node.__zeno_refresh_slots = () => {
        parseFromWidget();
        renderSlots();
        syncToWidget();
        updateNodeBounds();
    };

    node.__zeno_update_layout = (size) => {
        updateDynamicLayout(size);
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

        const origOnResize = nodeType.prototype.onResize;
        nodeType.prototype.onResize = function (size) {
            const r = origOnResize ? origOnResize.apply(this, arguments) : undefined;
            if (this.__zeno_update_layout) {
                this.__zeno_update_layout(size);
            }
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

