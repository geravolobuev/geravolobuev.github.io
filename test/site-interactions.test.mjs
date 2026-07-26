import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const home = await readFile(new URL("../_layouts/home.html", import.meta.url), "utf8");
const feed = await readFile(new URL("../_includes/feed-posts.html", import.meta.url), "utf8");
const styles = await readFile(new URL("../_includes/styles.html", import.meta.url), "utf8");
const interactions = await readFile(
  new URL("../assets/js/site-interactions.mjs", import.meta.url),
  "utf8",
);

test("notes open in an accessible in-page modal", () => {
  assert.match(home, /data-note-modal[^>]*role="dialog"[^>]*aria-modal="true"/s);
  assert.match(home, /data-note-modal-close[^>]*aria-label="close note"/s);
  assert.match(home, /data-note-modal-close[\s\S]*data-note-modal-panel/);
  assert.match(home, /data-note-modal-content/);
  assert.match(feed, /data-note-link/);
  assert.match(interactions, /fetch\(/);
  assert.match(interactions, /DOMParser/);
  assert.match(interactions, /history\.pushState/);
  assert.match(interactions, /popstate/);
  assert.match(interactions, /event\.key === "Escape"/);
  assert.match(interactions, /event\.key !== "Tab"/);
  assert.match(interactions, /event\.shiftKey/);
  assert.match(interactions, /\.inert\s*=/);
  assert.match(interactions, /url\.origin !== window\.location\.origin/);
  assert.match(interactions, /querySelectorAll\("script"\)/);
  assert.match(interactions, /attribute\.name\.toLowerCase\(\)\.startsWith\("on"\)/);
  assert.doesNotMatch(interactions, /\.innerHTML\s*=/);
});

test("the page scrollbar is hidden while scrolling remains available", () => {
  assert.match(styles, /html,\s*body\s*\{[^}]*scrollbar-width:\s*none/s);
  assert.match(styles, /html::-webkit-scrollbar,\s*body::-webkit-scrollbar\s*\{[^}]*display:\s*none/s);
  assert.doesNotMatch(styles, /::-webkit-scrollbar\s*\{\s*width:\s*50px/s);
});

test("the note container animates open and closed with reduced-motion support", () => {
  assert.match(styles, /\.note-modal\s*\{[^}]*opacity:\s*0/s);
  assert.match(styles, /\.note-modal\.is-open\s*\{[^}]*opacity:\s*1/s);
  assert.match(styles, /\.note-modal__panel\s*\{[^}]*transform:/s);
  assert.match(styles, /\.note-modal\.is-open\s+\.note-modal__panel/s);
  assert.match(interactions, /classList\.add\("is-open"\)/);
  assert.match(interactions, /classList\.remove\("is-open"\)/);
  assert.match(interactions, /setTimeout\(/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.note-modal[\s\S]*transition:\s*none/s);
});

test("initial and scroll-entering text reveal slowly with a reduced-motion fallback", () => {
  assert.match(home, /data-reveal/);
  assert.match(feed, /data-reveal/);
  assert.match(interactions, /IntersectionObserver/);
  assert.match(interactions, /requestAnimationFrame/);
  assert.match(styles, /\.reveal-ready \[data-reveal\]/);
  assert.match(styles, /transition:[^;]*opacity\s+1\.[0-9]+s/s);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\[data-reveal\][\s\S]*opacity:\s*1/s);
});

test("desktop wheel scrolling is inertial but remains progressive enhancement", () => {
  assert.match(interactions, /addEventListener\("wheel"[\s\S]*passive:\s*false/s);
  assert.match(interactions, /matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(interactions, /requestAnimationFrame/);
  assert.match(interactions, /scrollTo\(/);
  assert.match(interactions, /current = read\(\);\s*target = current;/s);
  assert.match(interactions, /document\.documentElement\.classList\.add\("inertial-scroll"\)/);
  assert.match(styles, /overscroll-behavior/);
  assert.match(styles, /html\.inertial-scroll\s*\{[^}]*scroll-behavior:\s*auto\s*!important/s);
  assert.match(home, /<script type="module" src="\/assets\/js\/site-interactions\.mjs\?v=[^"]+"><\/script>/);
});
