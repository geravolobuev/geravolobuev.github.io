import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const home = await readFile(new URL("../_layouts/home.html", import.meta.url), "utf8");
const feed = await readFile(new URL("../_includes/feed-posts.html", import.meta.url), "utf8");
const styles = await readFile(new URL("../_includes/styles.html", import.meta.url), "utf8");
const controller = await readFile(new URL("../assets/js/ui-sound.mjs", import.meta.url), "utf8");
const engineSource = await readFile(new URL("../assets/js/ui-sound-engine.mjs", import.meta.url), "utf8");

test("sound has an accessible persistent on/off control", () => {
  assert.match(home, /data-sound-toggle/);
  assert.match(home, /aria-pressed="true"/);
  assert.match(home, />sound:\s*on</);
  assert.match(home, /<script type="module" src="\/assets\/js\/ui-sound\.mjs\?v=[^"]+"><\/script>/);
  assert.match(controller, /localStorage/);
  assert.match(controller, /data-sound-toggle/);
  assert.match(controller, /aria-pressed/);
  assert.match(controller, /sound:\s*\$\{soundEnabled \? "on" : "off"\}/);
  assert.match(controller, /hasUnlocked/);
  assert.match(controller, /if \(!soundEnabled \|\| !hasUnlocked\) return/);
  assert.match(controller, /engine\.unlock\(\)/);
  assert.match(controller, /addEventListener\("pointerdown"[\s\S]*capture:\s*true/);
  assert.match(controller, /addEventListener\("keydown"[\s\S]*capture:\s*true/);
  assert.match(controller, /removeEventListener\("pointerdown"/);
  assert.match(controller, /closest\?\.\("\[data-sound-toggle\]"\)/);
  assert.match(controller, /dataset\.soundActive/);
  assert.match(controller, /dataset\.soundLastCue/);
  assert.match(controller, /dataset\.soundReady/);
  assert.match(controller, /\.\/ui-sound-engine\.mjs\?v=[^"]+/);
  assert.match(styles, /\.sound-toggle/);
  assert.match(styles, /\.sound-toggle:focus-visible/);
});

test("links map to distinct hover and activation cues", () => {
  assert.match(home, /href="mailto:[^"]+"[^>]*data-ui-sound="mail"/);
  assert.match(home, /href="http:\/\/pirs5\.ru"[^>]*data-ui-sound="external"/);
  assert.match(home, /href="http:\/\/www\.linkedin\.com\/in\/geravolobuev"[^>]*data-ui-sound="external"/);
  assert.match(feed, /data-ui-sound="note"/);
  assert.match(controller, /pointerover/);
  assert.match(controller, /pointerdown/);
  assert.match(controller, /focusin/);
  assert.match(controller, /click/);
  assert.doesNotMatch(controller, /event\.detail === 0/);
  for (const cue of ["hover", "note", "external", "mail", "enter"]) {
    assert.match(engineSource, new RegExp(`${cue}:`));
  }
  assert.doesNotMatch(engineSource, /toggleOn:|toggleOff:/);
});

test("the sound palette is synthesized locally rather than loading audio assets", async () => {
  const engine = await import(new URL("../assets/js/ui-sound-engine.mjs", import.meta.url));

  assert.equal(Math.round(engine.midiToFrequency(69)), 440);
  assert.deepEqual(engine.CHROMATIC_PALETTE, [57, 58, 60, 61, 63, 64, 66, 67]);
  assert.match(engineSource, /createOscillator/);
  assert.match(engineSource, /createBiquadFilter/);
  assert.match(engineSource, /master\.gain\.value\s*=\s*0\.16/);
  assert.match(engineSource, /\.disconnect\(\)/);
  assert.match(engineSource, /catch\s*\{/);
  assert.doesNotMatch(`${engineSource}\n${controller}`, /\b(?:fetch|new Audio|\.mp3|\.wav|\.ogg)\b/);
});

test("the audio engine resumes safely, schedules a cue, and releases its nodes", async () => {
  const { createUiSoundEngine } = await import(new URL("../assets/js/ui-sound-engine.mjs", import.meta.url));

  class FakeParam {
    setValueAtTime() {}
    exponentialRampToValueAtTime() {}
  }

  class FakeNode {
    constructor() {
      this.frequency = new FakeParam();
      this.detune = new FakeParam();
      this.gain = new FakeParam();
      this.Q = new FakeParam();
      this.listeners = new Map();
      this.disconnected = false;
    }
    connect() {}
    disconnect() {
      this.disconnected = true;
    }
    addEventListener(name, callback) {
      this.listeners.set(name, callback);
    }
    start() {}
    stop() {}
  }

  class FakeAudioContext {
    static instance;
    constructor() {
      FakeAudioContext.instance = this;
      this.currentTime = 1;
      this.destination = new FakeNode();
      this.state = "suspended";
      this.nodes = [];
      this.resumeCount = 0;
    }
    createGain() {
      const node = new FakeNode();
      this.nodes.push(node);
      return node;
    }
    createBiquadFilter() {
      const node = new FakeNode();
      this.nodes.push(node);
      return node;
    }
    createOscillator() {
      const node = new FakeNode();
      this.nodes.push(node);
      return node;
    }
    async resume() {
      this.resumeCount += 1;
      this.state = "running";
    }
  }

  const engine = createUiSoundEngine(FakeAudioContext);
  await engine.play("note");

  const context = FakeAudioContext.instance;
  assert.equal(context.resumeCount, 1);
  assert.equal(context.nodes[0].gain.value, 0.16);
  assert.equal(context.nodes.filter((node) => node.listeners.has("ended")).length, 2);

  for (const node of context.nodes.filter((candidate) => candidate.listeners.has("ended"))) {
    node.listeners.get("ended")();
  }

  assert.equal(context.nodes.filter((node) => node !== context.nodes[0] && node.disconnected).length, 8);
  assert.equal(await createUiSoundEngine(undefined).unlock(), false);
});
