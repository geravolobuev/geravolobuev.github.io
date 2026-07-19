import test from "node:test";
import assert from "node:assert/strict";

import { getGalleryIndex } from "../assets/js/gallery-state.mjs";

test("maps pointer position across the gallery without exceeding its bounds", () => {
  assert.equal(getGalleryIndex({ clientX: 100, left: 100, width: 400, count: 5 }), 0);
  assert.equal(getGalleryIndex({ clientX: 300, left: 100, width: 400, count: 5 }), 2);
  assert.equal(getGalleryIndex({ clientX: 500, left: 100, width: 400, count: 5 }), 4);
  assert.equal(getGalleryIndex({ clientX: 900, left: 100, width: 400, count: 5 }), 4);
  assert.equal(getGalleryIndex({ clientX: 0, left: 100, width: 400, count: 5 }), 0);
});

test("returns the first frame for empty, single-frame, or invalid galleries", () => {
  assert.equal(getGalleryIndex({ clientX: 100, left: 0, width: 0, count: 4 }), 0);
  assert.equal(getGalleryIndex({ clientX: 100, left: 0, width: 400, count: 1 }), 0);
  assert.equal(getGalleryIndex({ clientX: 100, left: 0, width: 400, count: 0 }), 0);
});
