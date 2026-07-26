import { createUiSoundEngine } from "./ui-sound-engine.mjs?v=20260726-7";

const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const engine = createUiSoundEngine(AudioContextClass);
let lastHoverAt = 0;
let lastActivationAt = 0;
let lastActivationTarget;
let hasUnlocked = false;
let unlockPromise;

document.documentElement.dataset.soundReady = "true";

const cueFor = (target) => target?.dataset.uiSound || "external";

const playCue = (cueName) => {
  if (!hasUnlocked) return;
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
  if (!hasUnlocked) return;
  const target = event.target.closest?.("[data-ui-sound]");
  if (!target || target.contains(event.relatedTarget)) return;

  const now = performance.now();
  if (now - lastHoverAt < 90) return;
  lastHoverAt = now;
  playCue("hover");
});

document.addEventListener("focusin", (event) => {
  if (!hasUnlocked) return;
  if (event.target.matches?.("[data-ui-sound]")) {
    playCue("hover");
  }
});

document.addEventListener("pointerdown", async (event) => {
  const target = event.target.closest?.("[data-ui-sound]");
  if (target && await ensureUnlocked()) {
    playCue(cueFor(target));
    lastActivationTarget = target;
    lastActivationAt = Date.now();
  }
});

document.addEventListener("click", async (event) => {
  const target = event.target.closest?.("[data-ui-sound]");
  if (!target || !(await ensureUnlocked())) return;
  if (target === lastActivationTarget && Date.now() - lastActivationAt < 500) return;
  playCue(cueFor(target));
});
