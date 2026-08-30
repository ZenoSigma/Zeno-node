import assert from "node:assert/strict";
import test from "node:test";

import {
    PROMPT_LIBRARY_LAYOUT,
    calculateContainerHeight,
    calculateDomWidgetHeight,
    calculateGridHeight,
    calculateNodeHeight,
    calculateNodeWidth,
    hideWidgetFromLayout,
    measureUnscaledElementHeight,
} from "../web/prompt_library_layout.mjs";

test("element height measurement is not reduced by canvas zoom", () => {
    const zoomedElement = {
        offsetHeight: 120,
        getBoundingClientRect: () => ({ height: 96 }),
    };
    const rectOnlyElement = {
        offsetHeight: 0,
        getBoundingClientRect: () => ({ height: 96 }),
    };

    assert.equal(measureUnscaledElementHeight(zoomedElement), 120);
    assert.equal(measureUnscaledElementHeight(rectOnlyElement), 96);
});

test("grid height uses the tallest rendered slot in each row", () => {
    const height = calculateGridHeight([50, 80, 60, 70], 2, [120, 150, 125, 140]);
    assert.equal(
        height,
        150 + PROMPT_LIBRARY_LAYOUT.GRID_GAP + 140 + PROMPT_LIBRARY_LAYOUT.LIST_BOTTOM_PADDING,
    );
});

test("incomplete DOM measurements fall back to stable control sizes", () => {
    const height = calculateContainerHeight({
        slotTextHeights: [50],
        measuredSlotHeights: [12],
        columns: 1,
        toolbarHeight: 8,
        addButtonHeight: 9,
    });
    const expectedGridHeight =
        PROMPT_LIBRARY_LAYOUT.DEFAULT_TEXTAREA_HEIGHT +
        PROMPT_LIBRARY_LAYOUT.DEFAULT_SLOT_CHROME_HEIGHT +
        PROMPT_LIBRARY_LAYOUT.LIST_BOTTOM_PADDING;
    assert.equal(
        height,
        PROMPT_LIBRARY_LAYOUT.DEFAULT_TOOLBAR_HEIGHT +
            PROMPT_LIBRARY_LAYOUT.GRID_GAP +
            expectedGridHeight +
            PROMPT_LIBRARY_LAYOUT.GRID_GAP +
            PROMPT_LIBRARY_LAYOUT.DEFAULT_ADD_BUTTON_HEIGHT +
            PROMPT_LIBRARY_LAYOUT.FIT_CONTENT_GUARD,
    );
});

test("Fit Size keeps content height and bottom controls in separate bands", () => {
    const containerHeight = calculateContainerHeight({
        slotTextHeights: [50, 50, 50],
        measuredSlotHeights: [112, 114, 116],
        columns: 2,
        toolbarHeight: 36,
        addButtonHeight: 34,
    });
    const nodeHeight = calculateNodeHeight(containerHeight);
    const widgetHeight = calculateDomWidgetHeight(nodeHeight);

    assert.equal(widgetHeight, containerHeight);
    assert.equal(
        nodeHeight -
            PROMPT_LIBRARY_LAYOUT.WIDGET_START_Y -
            PROMPT_LIBRARY_LAYOUT.WIDGET_LAYOUT_GAP -
            widgetHeight,
        PROMPT_LIBRARY_LAYOUT.BOTTOM_SAFE_AREA,
    );
});

test("column count enforces the corresponding minimum node width", () => {
    assert.equal(calculateNodeWidth(400, 1), 400);
    assert.equal(calculateNodeWidth(500, 3), 960);
    assert.equal(calculateNodeWidth(1200, 2), 1200);
});

test("storage widgets are removed from layout without disabling serialization", () => {
    const widget = {
        type: "text",
        hidden: false,
        computedHeight: 24,
        value: "serialized value",
        element: { style: {} },
    };

    hideWidgetFromLayout(widget);

    assert.equal(widget.type, "hidden");
    assert.equal(widget.hidden, true);
    assert.equal(widget.computedHeight, 0);
    assert.deepEqual(widget.computeSize(), [0, -4]);
    assert.equal(widget.value, "serialized value");
    assert.equal(widget.serialize, undefined);
    assert.equal(widget.element.style.display, "none");
});

test("default slot sizes calculate expected container and node bounds", () => {
    const containerHeight = calculateContainerHeight({
        slotTextHeights: [undefined, undefined],
        columns: 1,
        toolbarHeight: 36,
        addButtonHeight: 34,
    });
    const nodeHeight = calculateNodeHeight(containerHeight);
    const widgetHeight = calculateDomWidgetHeight(nodeHeight);

    assert.ok(nodeHeight >= PROMPT_LIBRARY_LAYOUT.MIN_NODE_HEIGHT);
    assert.equal(widgetHeight, containerHeight);
});

