import { app } from "../../scripts/app.js";

/**
 * Zeno - Advanced Save Image Frontend Extension
 * Provides interactive audio preview and sound testing directly within ComfyUI.
 */

// Web Audio API Synthesizer for instant browser-side preview fallback
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
}

function playSynthesizedSound(soundChoice) {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        const playTone = (freq, startOffset, duration, type = "sine", gainVal = 0.25) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, now + startOffset);
            
            gain.gain.setValueAtTime(gainVal, now + startOffset);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(now + startOffset);
            osc.stop(now + startOffset + duration);
        };

        const choice = (soundChoice || "Chimes").toLowerCase();

        if (choice.includes("chimes")) {
            playTone(659.25, 0.00, 0.6, "sine", 0.2); // E5
            playTone(830.61, 0.10, 0.6, "sine", 0.2); // G#5
            playTone(987.77, 0.20, 0.7, "sine", 0.25); // B5
            playTone(1318.5, 0.30, 1.0, "sine", 0.3); // E6
        } else if (choice.includes("ding")) {
            playTone(1200, 0.0, 0.8, "sine", 0.35);
            playTone(2400, 0.0, 0.3, "sine", 0.1);
        } else if (choice.includes("notify")) {
            playTone(587.33, 0.00, 0.25, "sine", 0.25); // D5
            playTone(880.00, 0.12, 0.60, "sine", 0.30); // A5
        } else if (choice.includes("tada")) {
            playTone(523.25, 0.00, 0.20, "triangle", 0.25); // C5
            playTone(659.25, 0.12, 0.20, "triangle", 0.25); // E5
            playTone(783.99, 0.24, 0.20, "triangle", 0.25); // G5
            playTone(1046.5, 0.36, 0.90, "triangle", 0.35); // C6
        } else if (choice.includes("chord")) {
            playTone(261.63, 0.0, 0.9, "sine", 0.2); // C4
            playTone(329.63, 0.0, 0.9, "sine", 0.2); // E4
            playTone(392.00, 0.0, 0.9, "sine", 0.2); // G4
            playTone(523.25, 0.0, 1.1, "sine", 0.25); // C5
        } else if (choice.includes("speech") || choice.includes("blip")) {
            playTone(800, 0.00, 0.08, "sine", 0.3);
            playTone(1200, 0.09, 0.14, "sine", 0.35);
        } else if (choice.includes("ring")) {
            playTone(750, 0.00, 0.2, "sine", 0.2);
            playTone(850, 0.00, 0.2, "sine", 0.2);
            playTone(750, 0.25, 0.35, "sine", 0.25);
            playTone(850, 0.25, 0.35, "sine", 0.25);
        } else if (choice.includes("synth")) {
            playTone(523.25, 0.00, 0.15, "sine", 0.25);
            playTone(659.25, 0.08, 0.15, "sine", 0.25);
            playTone(783.99, 0.16, 0.15, "sine", 0.25);
            playTone(1046.5, 0.24, 0.50, "sine", 0.35);
        } else if (choice.includes("exclamation")) {
            playTone(440, 0.0, 0.4, "triangle", 0.35);
            playTone(350, 0.1, 0.4, "sawtooth", 0.15);
        } else {
            // Asterisk / Default
            playTone(880, 0.0, 0.35, "sine", 0.3);
        }
    } catch (e) {
        console.warn("[Zeno] Web Audio preview error:", e);
    }
}

/**
 * Trigger sound test via both server backend (winsound / OS audio) and browser Web Audio
 */
function triggerTestSound(soundChoice) {
    const sound = soundChoice || "Chimes";

    // 1. Trigger server host sound (useful when running locally)
    fetch(`/zeno/test_sound?sound=${encodeURIComponent(sound)}`)
        .catch(() => {
            // Ignore if backend endpoint unavailable
        });

    // 2. Play web audio synthesis (useful for remote browser or instant feedback)
    playSynthesizedSound(sound);
}

function attachSoundWidgets(node) {
    if (!node || !node.widgets) return;

    // Check if test button already exists
    const hasTestBtn = node.widgets.some((w) => w.name === "test_alert_sound");
    const soundWidget = node.widgets.find((w) => w.name === "sound_choice");

    // Hook change listener on sound_choice dropdown to auto-preview on change
    if (soundWidget && !soundWidget.__zeno_preview_hooked) {
        soundWidget.__zeno_preview_hooked = true;
        const origCallback = soundWidget.callback;
        soundWidget.callback = function (value) {
            const res = origCallback ? origCallback.apply(this, arguments) : undefined;
            triggerTestSound(value);
            return res;
        };
    }

    // Add explicit "🔊 Test Sound" button widget if not yet added
    if (!hasTestBtn && node.addWidget) {
        node.addWidget("button", "🔊 Test Sound", "test_alert_sound", () => {
            const currentSound = soundWidget ? soundWidget.value : "Chimes";
            triggerTestSound(currentSound);
        });
        if (node.setSize && node.size) {
            node.setSize([node.size[0], node.computeSize ? node.computeSize()[1] : node.size[1]]);
        }
        if (node.setDirtyCanvas) {
            node.setDirtyCanvas(true, true);
        }
    }
}

app.registerExtension({
    name: "Zeno.AdvancedSaveImage",

    // ComfyUI 2.0 (Vue nodes) hook
    async nodeCreated(node) {
        if (node.comfyClass === "AdvancedSaveImage" || node.type === "AdvancedSaveImage") {
            setTimeout(() => attachSoundWidgets(node), 10);
        }
    },

    // LiteGraph prototype hooks
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "AdvancedSaveImage") {
            return;
        }

        const origOnNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const r = origOnNodeCreated ? origOnNodeCreated.apply(this, arguments) : undefined;
            attachSoundWidgets(this);
            return r;
        };

        const origOnConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function () {
            const r = origOnConfigure ? origOnConfigure.apply(this, arguments) : undefined;
            setTimeout(() => attachSoundWidgets(this), 10);
            return r;
        };
    },
});
