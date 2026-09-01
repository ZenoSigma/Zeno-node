export const PROMPT_LIBRARY_LAYOUT = Object.freeze({
    WIDGET_START_Y: 35,
    WIDGET_LAYOUT_GAP: 4,
    BOTTOM_SAFE_AREA: 48,
    MIN_DOM_WIDGET_HEIGHT: 120,
    MIN_CONTAINER_HEIGHT: 160,
    MIN_NODE_HEIGHT: 220,
    MIN_NODE_WIDTH: 400,
    MIN_COLUMN_WIDTH: 320,
    GRID_GAP: 8,
    LIST_BOTTOM_PADDING: 8,
    FIT_CONTENT_GUARD: 4,
    DEFAULT_TOOLBAR_HEIGHT: 36,
    DEFAULT_ADD_BUTTON_HEIGHT: 34,
    DEFAULT_TEXTAREA_HEIGHT: 50,
    DEFAULT_SLOT_CHROME_HEIGHT: 56,
    MIN_MEASURED_CONTROL_HEIGHT: 20,
    MIN_MEASURED_SLOT_HEIGHT: 35,
});

function positiveNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeColumns(columns) {
    return Math.max(1, Math.min(6, Math.floor(positiveNumber(columns, 1))));
}

export function measureUnscaledElementHeight(element, fallback = 0) {
    // Nodes 2.0 scales DOM widgets together with the graph canvas. The bounding
    // rectangle therefore changes with canvas zoom, while offsetHeight remains
    // in CSS layout pixels—the same unit used by LiteGraph node sizes.
    const offsetHeight = positiveNumber(element?.offsetHeight, 0);
    if (offsetHeight > 0) {
        return offsetHeight;
    }

    const boundingHeight = positiveNumber(
        element?.getBoundingClientRect?.().height,
        fallback,
    );
    return boundingHeight;
}

export function calculateGridHeight(slotTextHeights, columns, measuredSlotHeights = []) {
    const heights = Array.isArray(slotTextHeights) ? slotTextHeights : [];
    if (heights.length === 0) {
        return PROMPT_LIBRARY_LAYOUT.LIST_BOTTOM_PADDING;
    }

    const cols = normalizeColumns(columns);
    const totalRows = Math.ceil(heights.length / cols);
    let gridHeight = 0;

    for (let row = 0; row < totalRows; row++) {
        let maxRowHeight = 0;
        for (let col = 0; col < cols; col++) {
            const index = row * cols + col;
            if (index >= heights.length) break;

            const fallbackHeight =
                positiveNumber(
                    heights[index],
                    PROMPT_LIBRARY_LAYOUT.DEFAULT_TEXTAREA_HEIGHT,
                ) + PROMPT_LIBRARY_LAYOUT.DEFAULT_SLOT_CHROME_HEIGHT;
            const measuredHeight = positiveNumber(measuredSlotHeights[index], 0);
            const resolvedHeight = measuredHeight > PROMPT_LIBRARY_LAYOUT.MIN_MEASURED_SLOT_HEIGHT
                ? measuredHeight
                : fallbackHeight;
            maxRowHeight = Math.max(maxRowHeight, resolvedHeight);
        }
        gridHeight += maxRowHeight;
    }

    if (totalRows > 1) {
        gridHeight += (totalRows - 1) * PROMPT_LIBRARY_LAYOUT.GRID_GAP;
    }

    return gridHeight + PROMPT_LIBRARY_LAYOUT.LIST_BOTTOM_PADDING;
}

export function calculateContainerHeight({
    slotTextHeights,
    measuredSlotHeights = [],
    columns = 1,
    toolbarHeight = PROMPT_LIBRARY_LAYOUT.DEFAULT_TOOLBAR_HEIGHT,
    addButtonHeight = PROMPT_LIBRARY_LAYOUT.DEFAULT_ADD_BUTTON_HEIGHT,
}) {
    const gridHeight = calculateGridHeight(
        slotTextHeights,
        columns,
        measuredSlotHeights,
    );
    const resolvedToolbarHeight =
        positiveNumber(toolbarHeight, 0) > PROMPT_LIBRARY_LAYOUT.MIN_MEASURED_CONTROL_HEIGHT
            ? Number(toolbarHeight)
            : PROMPT_LIBRARY_LAYOUT.DEFAULT_TOOLBAR_HEIGHT;
    const resolvedAddButtonHeight =
        positiveNumber(addButtonHeight, 0) > PROMPT_LIBRARY_LAYOUT.MIN_MEASURED_CONTROL_HEIGHT
            ? Number(addButtonHeight)
            : PROMPT_LIBRARY_LAYOUT.DEFAULT_ADD_BUTTON_HEIGHT;
    const contentHeight =
        resolvedToolbarHeight +
        PROMPT_LIBRARY_LAYOUT.GRID_GAP +
        gridHeight +
        PROMPT_LIBRARY_LAYOUT.GRID_GAP +
        resolvedAddButtonHeight +
        PROMPT_LIBRARY_LAYOUT.FIT_CONTENT_GUARD;

    return Math.max(PROMPT_LIBRARY_LAYOUT.MIN_CONTAINER_HEIGHT, Math.ceil(contentHeight));
}

export function calculateNodeHeight(containerHeight) {
    const contentHeight = positiveNumber(
        containerHeight,
        PROMPT_LIBRARY_LAYOUT.MIN_CONTAINER_HEIGHT,
    );
    return Math.max(
        PROMPT_LIBRARY_LAYOUT.MIN_NODE_HEIGHT,
        Math.ceil(
            PROMPT_LIBRARY_LAYOUT.WIDGET_START_Y +
            PROMPT_LIBRARY_LAYOUT.WIDGET_LAYOUT_GAP +
            contentHeight +
            PROMPT_LIBRARY_LAYOUT.BOTTOM_SAFE_AREA,
        ),
    );
}

export function calculateDomWidgetHeight(nodeHeight) {
    const height = positiveNumber(nodeHeight, PROMPT_LIBRARY_LAYOUT.MIN_NODE_HEIGHT);
    return Math.max(
        PROMPT_LIBRARY_LAYOUT.MIN_DOM_WIDGET_HEIGHT,
        Math.floor(
            height -
            PROMPT_LIBRARY_LAYOUT.WIDGET_START_Y -
            PROMPT_LIBRARY_LAYOUT.WIDGET_LAYOUT_GAP -
            PROMPT_LIBRARY_LAYOUT.BOTTOM_SAFE_AREA,
        ),
    );
}

export function calculateNodeWidth(currentWidth, columns) {
    const minWidth = Math.max(
        PROMPT_LIBRARY_LAYOUT.MIN_NODE_WIDTH,
        normalizeColumns(columns) * PROMPT_LIBRARY_LAYOUT.MIN_COLUMN_WIDTH,
    );
    return Math.max(minWidth, positiveNumber(currentWidth, PROMPT_LIBRARY_LAYOUT.MIN_NODE_WIDTH));
}

export function shouldPassThroughKeyEvent(e) {
    if (!e) return false;
    const isModifier = Boolean(e.ctrlKey || e.metaKey);
    const key = (e.key || "").toLowerCase();
    const code = e.code || "";

    // Allow global ComfyUI shortcut combinations to bubble to window:
    // - Ctrl+S / Cmd+S (Save workflow)
    // - Ctrl+Shift+S (Save workflow as...)
    // - Ctrl+Enter / Cmd+Enter (Queue Prompt)
    if (isModifier && (key === "s" || code === "KeyS" || key === "enter" || code === "Enter" || code === "NumpadEnter")) {
        return true;
    }

    return false;
}

export function handleInputKeydown(e) {
    if (shouldPassThroughKeyEvent(e)) {
        return;
    }
    e.stopPropagation();
}

export function hideWidgetFromLayout(widget) {
    if (!widget) return;

    // `type = hidden` is enough for Classic LiteGraph, but Nodes 2.0 has already
    // created a host row by the time extensions run. The explicit `hidden` flag
    // removes that row from layout while preserving the widget value/serialization.
    widget.type = "hidden";
    widget.hidden = true;
    widget.computedHeight = 0;
    widget.computeSize = () => [0, -4];
    widget.draw = () => {};

    if (widget.element) {
        widget.element.style.display = "none";
        widget.element.style.height = "0px";
        widget.element.style.margin = "0px";
        widget.element.style.padding = "0px";
    }
}

