import { app } from "../../scripts/app.js";

/**
 * Zeno - Smart Ratio Latent Generator Frontend Extension
 * Automatically locks / disables the aspect_ratio and swap_dimensions widgets
 * when an input (image or mask) is connected, making it intuitive that aspect ratio
 * is automatically derived from the input tensor.
 */

function updateRatioNodeLockState(node) {
    if (!node || !node.widgets) {
        return;
    }

    // Check if either 'image' or 'mask' input has an active link
    const hasImage = node.inputs?.some((i) => i.name === "image" && i.link != null);
    const hasMask = node.inputs?.some((i) => i.name === "mask" && i.link != null);
    const isInputConnected = Boolean(hasImage || hasMask);

    const aspectRatioWidget = node.widgets.find((w) => w.name === "aspect_ratio");
    const swapWidget = node.widgets.find((w) => w.name === "swap_dimensions");

    if (aspectRatioWidget) {
        if (!aspectRatioWidget.__zeno_orig_label) {
            aspectRatioWidget.__zeno_orig_label = aspectRatioWidget.label || "aspect_ratio";
        }
        aspectRatioWidget.disabled = isInputConnected;
        aspectRatioWidget.label = isInputConnected
            ? `${aspectRatioWidget.__zeno_orig_label} (🔒 Auto from Input)`
            : aspectRatioWidget.__zeno_orig_label;

        // Hook mouse to prevent LiteGraph popup selection when disabled
        if (!aspectRatioWidget.__zeno_mouse_hooked) {
            aspectRatioWidget.__zeno_mouse_hooked = true;
            const origMouse = aspectRatioWidget.mouse;
            aspectRatioWidget.mouse = function () {
                if (this.disabled) {
                    return true;
                }
                return origMouse ? origMouse.apply(this, arguments) : undefined;
            };
        }
    }

    if (swapWidget) {
        if (!swapWidget.__zeno_orig_label) {
            swapWidget.__zeno_orig_label = swapWidget.label || "swap_dimensions";
        }
        swapWidget.disabled = isInputConnected;
        swapWidget.label = isInputConnected
            ? `${swapWidget.__zeno_orig_label} (🔒 Disabled with Input)`
            : swapWidget.__zeno_orig_label;

        if (!swapWidget.__zeno_mouse_hooked) {
            swapWidget.__zeno_mouse_hooked = true;
            const origMouse = swapWidget.mouse;
            swapWidget.mouse = function () {
                if (this.disabled) {
                    return true;
                }
                return origMouse ? origMouse.apply(this, arguments) : undefined;
            };
        }
    }

    // ComfyUI 2.0 (Vue nodes) DOM elements visual update
    [aspectRatioWidget, swapWidget].forEach((w) => {
        if (w) {
            const el = w.element || (w.inputEl ? w.inputEl.parentElement : null);
            if (el) {
                el.style.opacity = isInputConnected ? "0.45" : "1.0";
                el.style.pointerEvents = isInputConnected ? "none" : "auto";
                el.style.filter = isInputConnected ? "grayscale(0.8)" : "none";
                el.style.transition = "opacity 0.2s ease, filter 0.2s ease";
                if (w.inputEl) {
                    w.inputEl.disabled = isInputConnected;
                }
            }
        }
    });

    if (node.setDirtyCanvas) {
        node.setDirtyCanvas(true, true);
    }
}

app.registerExtension({
    name: "Zeno.SmartRatio",

    // ComfyUI 2.0 (Vue nodes) instance hook
    async nodeCreated(node) {
        if (node.comfyClass === "RatioLatentGenerator" || node.type === "RatioLatentGenerator") {
            setTimeout(() => updateRatioNodeLockState(node), 10);
        }
    },

    // LiteGraph prototype & connection hooks
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "RatioLatentGenerator") {
            return;
        }

        const origOnNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const r = origOnNodeCreated ? origOnNodeCreated.apply(this, arguments) : undefined;
            updateRatioNodeLockState(this);
            return r;
        };

        const origOnConnectionsChange = nodeType.prototype.onConnectionsChange;
        nodeType.prototype.onConnectionsChange = function (side, slotIndex, isConnected) {
            const r = origOnConnectionsChange ? origOnConnectionsChange.apply(this, arguments) : undefined;
            // Delay slightly to let LiteGraph update link state on node.inputs
            setTimeout(() => updateRatioNodeLockState(this), 10);
            return r;
        };

        const origOnConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function () {
            const r = origOnConfigure ? origOnConfigure.apply(this, arguments) : undefined;
            setTimeout(() => updateRatioNodeLockState(this), 10);
            return r;
        };
    }
});
