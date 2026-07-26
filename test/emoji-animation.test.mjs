import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const home = await readFile(new URL("../_layouts/home.html", import.meta.url), "utf8");
const feed = await readFile(new URL("../_includes/feed-posts.html", import.meta.url), "utf8");
const styles = await readFile(new URL("../_includes/styles.html", import.meta.url), "utf8");

test("homepage emojis have meaning-specific animation hooks", () => {
  for (const name of ["wave", "work", "handshake", "mail", "toast"]) {
    assert.match(home, new RegExp(`class="emoji emoji--${name}"`));
  }
  assert.match(feed, /class="emoji emoji--write"/);
});

test("emoji motion is transform-only and respects reduced-motion preferences", () => {
  const emojiStyles = styles.match(/\.emoji \{[\s\S]*?@media \(prefers-reduced-motion: reduce\)/)?.[0] ?? "";

  for (const name of ["wave", "work", "handshake", "mail", "toast", "write"]) {
    assert.match(styles, new RegExp(`@keyframes emoji-${name}`));
    assert.match(styles, new RegExp(`\\.emoji--${name}\\s*\\{[^}]*animation:`, "s"));
  }
  assert.doesNotMatch(emojiStyles, /(?:top|right|bottom|left|margin|padding|width|height|opacity|will-change)\s*:/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.emoji\s*\{[^}]*animation:\s*none/s);
});

test("homepage uses compact leading and omits untitled feed entries", () => {
  assert.match(styles, /main\s*\{[^}]*line-height:\s*0\.9\s*;/s);
  assert.doesNotMatch(styles, /@media only screen and \(max-width: 600px\)[\s\S]*?main\s*\{[^}]*line-height:\s*2\.3rem/s);
  assert.match(feed, /\{%\s*if post\.title and post\.title != empty\s*%\}[\s\S]*<li>/);
});
