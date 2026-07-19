import test from "node:test";
import assert from "node:assert/strict";

import {
  BATCH_SIZE,
  createInitialState,
  filterEntries,
  getVisibleEntries,
  portfolioReducer,
  resolveLanguage,
  serializeView,
} from "../assets/js/portfolio-state.mjs";

const entries = [
  { id: "project-new", type: "project" },
  { id: "note-new", type: "note" },
  { id: "project-old", type: "project" },
  { id: "note-old", type: "note" },
];

test("defaults to works and reads an explicitly requested note", () => {
  const defaultState = createInitialState({ search: "", browserLanguage: "en-US" });
  const noteState = createInitialState({
    search: "?mode=notes&entry=note-new",
    browserLanguage: "en-US",
  });

  assert.equal(defaultState.mode, "project");
  assert.equal(defaultState.expandedEntry, null);
  assert.equal(noteState.mode, "note");
  assert.equal(noteState.expandedEntry, "note-new");
});

test("rejects unsupported query values", () => {
  const state = createInitialState({
    search: "?mode=archive&entry=%20",
    browserLanguage: "de-DE",
  });

  assert.equal(state.mode, "project");
  assert.equal(state.expandedEntry, null);
  assert.equal(state.language, "en");
});

test("stored language wins, otherwise Russian browsers use Russian", () => {
  assert.equal(resolveLanguage({ storedLanguage: "en", browserLanguage: "ru-RU" }), "en");
  assert.equal(resolveLanguage({ storedLanguage: null, browserLanguage: "ru-RU" }), "ru");
  assert.equal(resolveLanguage({ storedLanguage: "unsupported", browserLanguage: "fr-FR" }), "en");
});

test("filters the unified stream without mutating its entries", () => {
  const snapshot = structuredClone(entries);

  assert.deepEqual(filterEntries(entries, "project").map(({ id }) => id), ["project-new", "project-old"]);
  assert.deepEqual(filterEntries(entries, "note").map(({ id }) => id), ["note-new", "note-old"]);
  assert.deepEqual(entries, snapshot);
});

test("progressive rendering respects the active mode count", () => {
  const manyEntries = Array.from({ length: BATCH_SIZE + 2 }, (_, index) => ({
    id: `note-${index}`,
    type: "note",
  }));
  const state = createInitialState({ search: "?mode=notes", browserLanguage: "en" });
  const loadedState = portfolioReducer(state, { type: "LOAD_MORE" });

  assert.equal(getVisibleEntries(manyEntries, state).length, BATCH_SIZE);
  assert.equal(getVisibleEntries(manyEntries, loadedState).length, BATCH_SIZE + 2);
  assert.notEqual(loadedState, state);
});

test("mode changes preserve independent progress and scroll positions", () => {
  const initial = createInitialState({ search: "", browserLanguage: "en" });
  const scrolled = portfolioReducer(initial, {
    type: "SAVE_SCROLL",
    mode: "project",
    scrollTop: 480,
  });
  const notes = portfolioReducer(scrolled, { type: "SET_MODE", mode: "note" });
  const moreNotes = portfolioReducer(notes, { type: "LOAD_MORE" });
  const worksAgain = portfolioReducer(moreNotes, { type: "SET_MODE", mode: "project" });

  assert.equal(worksAgain.scrollPositions.project, 480);
  assert.equal(worksAgain.visibleCounts.project, BATCH_SIZE);
  assert.equal(worksAgain.visibleCounts.note, BATCH_SIZE * 2);
  assert.equal(initial.scrollPositions.project, 0);
});

test("entry and language actions return new immutable state", () => {
  const initial = createInitialState({ search: "", browserLanguage: "en" });
  const expanded = portfolioReducer(initial, { type: "TOGGLE_ENTRY", entryId: "project-new" });
  const collapsed = portfolioReducer(expanded, { type: "TOGGLE_ENTRY", entryId: "project-new" });
  const russian = portfolioReducer(collapsed, { type: "SET_LANGUAGE", language: "ru" });

  assert.equal(expanded.expandedEntry, "project-new");
  assert.equal(collapsed.expandedEntry, null);
  assert.equal(russian.language, "ru");
  assert.equal(initial.language, "en");
});

test("serializes shareable view state without refreshing", () => {
  const state = createInitialState({
    search: "?mode=notes&entry=note-new",
    browserLanguage: "ru-RU",
  });

  assert.equal(serializeView(state, "/"), "/?mode=notes&entry=note-new");
  assert.equal(serializeView({ ...state, mode: "project", expandedEntry: null }, "/"), "/");
});
