import { createUiSoundEngine } from "./ui-sound-engine.mjs?v=20260726-6";

const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const engine = createUiSoundEngine(AudioContextClass);
const soundToggle = document.querySelector("[data-sound-toggle]");
const preferenceKey = "portfolio-ui-sound";
let lastHoverAt = 0;
let lastActivationAt = 0;
let lastActivationTarget;
let hasUnlocked = false;
let unlockPromise;
let soundEnabled = true;

document.documentElement.dataset.soundReady = "true";

try {
  soundEnabled = localStorage.getItem(preferenceKey) !== "off";
} catch {
  soundEnabled = true;
}

const cueFor = (target) => target?.dataset.uiSound || "external";

const updateSoundToggle = () => {
  if (!soundToggle) return;
  soundToggle.setAttribute("aria-pressed", String(soundEnabled));
  soundToggle.textContent = `sound: ${soundEnabled ? "on" : "off"}`;
};

const playCue = (cueName) => {
  if (!soundEnabled || !hasUnlocked) return;
  document.documentElement.dataset.soundLastCue = cueName;
  engine.play(cueName);
};

const ensureUnlocked = () => {
  if (hasUnlocked) return Promise.resolve(true);
  if (!unlockPromise) {
    unlockPromise = engine.unlock().then((unlocked) => {
      hasUnlocked = unlocked;
      document.documentElement.dataset.soundActive = String(unlocked);
      if (!unlocked) unlockPromise = undefined;
      return unlocked;
    });
  }
  return unlockPromise;
};

const unlockSound = async (event) => {
  if (!soundEnabled) return;
  if (event.target.closest?.("[data-sound-toggle]")) return;
  if (!(await ensureUnlocked())) return;
  document.removeEventListener("pointerdown", unlockSound, true);
  document.removeEventListener("keydown", unlockSound, true);
  if (!event.target.closest?.("[data-ui-sound]")) {
    playCue("enter");
  }
};

document.addEventListener("pointerdown", unlockSound, { capture: true });
document.addEventListener("keydown", unlockSound, { capture: true });

document.addEventListener("pointerover", (event) => {
  if (!soundEnabled || !hasUnlocked) return;
  const target = event.target.closest?.("[data-ui-sound]");
  if (!target || target.contains(event.relatedTarget)) return;

  const now = performance.now();
  if (now - lastHoverAt < 90) return;
  lastHoverAt = now;
  playCue("hover");
});

document.addEventListener("focusin", (event) => {
  if (!soundEnabled || !hasUnlocked) return;
  if (event.target.matches?.("[data-ui-sound]")) {
    playCue("hover");
  }
});

document.addEventListener("pointerdown", async (event) => {
  const target = event.target.closest?.("[data-ui-sound]");
  if (soundEnabled && target && await ensureUnlocked()) {
    playCue(cueFor(target));
    lastActivationTarget = target;
    lastActivationAt = Date.now();
  }
});

document.addEventListener("click", async (event) => {
  const target = event.target.closest?.("[data-ui-sound]");
  if (!soundEnabled || !target || !(await ensureUnlocked())) return;
  if (target === lastActivationTarget && Date.now() - lastActivationAt < 500) return;
  playCue(cueFor(target));
});

soundToggle?.addEventListener("click", async () => {
  soundEnabled = !soundEnabled;
  try {
    localStorage.setItem(preferenceKey, soundEnabled ? "on" : "off");
  } catch {
    // The control still works for this visit when storage is unavailable.
  }
  updateSoundToggle();

  if (soundEnabled && await ensureUnlocked()) {
    document.removeEventListener("pointerdown", unlockSound, true);
    document.removeEventListener("keydown", unlockSound, true);
    playCue("enter");
  }
});

updateSoundToggle();
