export const BATCH_SIZE = 6;

const MODES = new Set(["project", "note"]);
const LANGUAGES = new Set(["en", "ru"]);

function normalizeMode(mode) {
  return MODES.has(mode) ? mode : "project";
}

function normalizeEntryId(entryId) {
  const normalized = typeof entryId === "string" ? entryId.trim() : "";
  return normalized || null;
}

export function resolveLanguage({ storedLanguage, browserLanguage }) {
  if (LANGUAGES.has(storedLanguage)) return storedLanguage;
  return String(browserLanguage).toLowerCase().startsWith("ru") ? "ru" : "en";
}

export function createInitialState({ search = "", storedLanguage = null, browserLanguage = "en" } = {}) {
  const params = new URLSearchParams(search);
  const mode = normalizeMode(params.get("mode") === "notes" ? "note" : params.get("mode"));

  return {
    mode,
    language: resolveLanguage({ storedLanguage, browserLanguage }),
    expandedEntry: normalizeEntryId(params.get("entry")),
    visibleCounts: {
      project: BATCH_SIZE,
      note: BATCH_SIZE,
    },
    scrollPositions: {
      project: 0,
      note: 0,
    },
  };
}

export function filterEntries(entries, mode) {
  const normalizedMode = normalizeMode(mode);
  return entries.filter((entry) => entry.type === normalizedMode);
}

export function getVisibleEntries(entries, state) {
  return filterEntries(entries, state.mode).slice(0, state.visibleCounts[state.mode]);
}

export function portfolioReducer(state, action) {
  switch (action.type) {
    case "SET_MODE":
      return {
        ...state,
        mode: normalizeMode(action.mode),
        expandedEntry: null,
      };
    case "LOAD_MORE":
      return {
        ...state,
        visibleCounts: {
          ...state.visibleCounts,
          [state.mode]: state.visibleCounts[state.mode] + BATCH_SIZE,
        },
      };
    case "SAVE_SCROLL": {
      const mode = normalizeMode(action.mode);
      const scrollTop = Number.isFinite(action.scrollTop) ? Math.max(0, action.scrollTop) : 0;
      return {
        ...state,
        scrollPositions: {
          ...state.scrollPositions,
          [mode]: scrollTop,
        },
      };
    }
    case "TOGGLE_ENTRY": {
      const entryId = normalizeEntryId(action.entryId);
      return {
        ...state,
        expandedEntry: state.expandedEntry === entryId ? null : entryId,
      };
    }
    case "SET_LANGUAGE":
      return {
        ...state,
        language: LANGUAGES.has(action.language) ? action.language : state.language,
      };
    case "HYDRATE_VIEW": {
      const hydrated = createInitialState({
        search: action.search,
        storedLanguage: state.language,
        browserLanguage: state.language,
      });
      return {
        ...state,
        mode: hydrated.mode,
        expandedEntry: hydrated.expandedEntry,
      };
    }
    default:
      return state;
  }
}

export function serializeView(state, pathname = "/") {
  const params = new URLSearchParams();
  if (state.mode === "note") params.set("mode", "notes");
  if (state.expandedEntry) params.set("entry", state.expandedEntry);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
