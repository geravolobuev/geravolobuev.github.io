import {
  BATCH_SIZE,
  createInitialState,
  filterEntries,
  getVisibleEntries,
  portfolioReducer,
  serializeView,
} from "./portfolio-state.mjs";
import { getGalleryIndex } from "./gallery-state.mjs";

const copy = {
  en: {
    modeTitle: { project: "works", note: "notes" },
  },
  ru: {
    modeTitle: { project: "работы", note: "заметки" },
  },
};

const streamPanel = document.querySelector(".stream-panel");
const stream = document.querySelector("[data-entry-stream]");
const cards = [...document.querySelectorAll("[data-entry]")];
const modeButtons = [...document.querySelectorAll("[data-mode]")];
const languageToggle = document.querySelector(".language-toggle");
const endMessage = document.querySelector("[data-end-message]");
const sentinel = document.querySelector("[data-stream-end]");
const modeTitle = document.querySelector("[data-mode-title]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const entries = cards.map((card) => ({
  id: card.dataset.entryId,
  type: card.dataset.entryType,
  element: card,
}));

function readStoredLanguage() {
  try {
    return window.localStorage.getItem("portfolio-language");
  } catch {
    return null;
  }
}

function readVisitedNotes() {
  try {
    const stored = JSON.parse(window.localStorage.getItem("portfolio-visited-notes") || "[]");
    return new Set(Array.isArray(stored) ? stored.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

let visitedNotes = readVisitedNotes();

function markNoteVisited(entryId) {
  visitedNotes = new Set([...visitedNotes, entryId]);
  try {
    window.localStorage.setItem("portfolio-visited-notes", JSON.stringify([...visitedNotes]));
  } catch {
    // Native :visited styling remains available when storage is blocked.
  }
}

let state = createInitialState({
  search: window.location.search,
  storedLanguage: readStoredLanguage(),
  browserLanguage: window.navigator.language,
});

function dispatch(action) {
  state = portfolioReducer(state, action);
}

function isDesktopLayout() {
  return window.matchMedia("(min-width: 761px)").matches;
}

function getScrollTop() {
  return isDesktopLayout() ? streamPanel.scrollTop : window.scrollY;
}

function restoreScrollTop(scrollTop) {
  if (isDesktopLayout()) streamPanel.scrollTop = scrollTop;
  else window.scrollTo({ top: scrollTop });
}

function prepareCoverVideo(video) {
  if (!video || video.dataset.qualityPrepared === "true") return;
  const revealFullQualityFrame = () => {
    video.classList.add("is-ready");
    video.play().catch(() => {});
  };
  video.dataset.qualityPrepared = "true";
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) revealFullQualityFrame();
  else video.addEventListener("loadeddata", revealFullQualityFrame, { once: true });
  video.addEventListener("error", () => showVideoFallback(video), { once: true });
}

function showVideoFallback(video) {
  const fallback = video.parentElement.querySelector("[data-video-fallback]");
  if (!fallback) return;
  if (fallback.dataset.src) {
    fallback.src = fallback.dataset.src;
    fallback.removeAttribute("data-src");
  }
  fallback.hidden = false;
  video.hidden = true;
}

function activateMedia(card) {
  const video = card.querySelector(".entry-hero video");
  if (!video) return;
  prepareCoverVideo(video);
  const source = video.querySelector("source[data-src]");
  video.preload = "auto";
  if (source) {
    source.src = source.dataset.src;
    source.removeAttribute("data-src");
    video.load();
  } else if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    video.classList.add("is-ready");
    video.play().catch(() => {});
  }
}

function preloadGalleryImages(gallery) {
  if (!gallery || gallery.dataset.preloaded === "true") return;
  gallery.querySelectorAll("img[data-src]").forEach((image) => {
    image.loading = "eager";
    image.src = image.dataset.src;
    image.removeAttribute("data-src");
    image.decode?.().catch(() => {});
  });
  gallery.dataset.preloaded = "true";
}

function buildProjectGallery(card) {
  const gallery = card.querySelector("[data-project-gallery]");
  if (!gallery || gallery.dataset.initialized === "true") return gallery;

  const mediaTemplate = card.querySelector("[data-project-media-template]");
  const sourceImages = mediaTemplate ? [...mediaTemplate.content.querySelectorAll("img")] : [];
  sourceImages.forEach((sourceImage) => {
    const frame = document.createElement("div");
    frame.className = "project-gallery__frame";
    frame.dataset.galleryFrame = "";
    frame.hidden = true;

    const image = document.createElement("img");
    image.dataset.src = sourceImage.getAttribute("src");
    image.alt = sourceImage.getAttribute("alt") || "";
    image.decoding = "async";
    frame.append(image);
    gallery.insertBefore(frame, gallery.querySelector("[data-gallery-counter]"));
  });

  const frames = [...gallery.querySelectorAll("[data-gallery-frame]")];
  const counter = gallery.querySelector("[data-gallery-counter]");

  function showFrame(index, { activateVideo = false } = {}) {
    const safeIndex = Math.min(frames.length - 1, Math.max(0, index));
    frames.forEach((frame, frameIndex) => {
      const isCurrent = frameIndex === safeIndex;
      frame.hidden = !isCurrent;
      const image = frame.querySelector("img[data-src]");
      if (isCurrent && image) {
        image.src = image.dataset.src;
        image.removeAttribute("data-src");
      }
      const video = frame.querySelector("video");
      if (video && !isCurrent) video.pause();
    });

    const currentVideo = frames[safeIndex]?.querySelector("video");
    const currentSource = currentVideo?.querySelector("source");
    if (currentVideo && (activateVideo || currentSource?.src)) {
      if (activateVideo) activateMedia(card);
      currentVideo.play().catch(() => {});
    }
    gallery.dataset.galleryIndex = String(safeIndex);
    counter.textContent = `${safeIndex + 1} / ${frames.length}`;
  }

  function scrub(event) {
    if (event.pointerType !== "mouse" && gallery.dataset.pointerActive !== "true") return;
    const bounds = gallery.getBoundingClientRect();
    showFrame(getGalleryIndex({
      clientX: event.clientX,
      left: bounds.left,
      width: bounds.width,
      count: frames.length,
    }), { activateVideo: true });
  }

  gallery.addEventListener("pointerdown", (event) => {
    gallery.dataset.pointerActive = "true";
    gallery.setPointerCapture?.(event.pointerId);
    scrub(event);
  });
  gallery.addEventListener("pointermove", scrub);
  gallery.addEventListener("pointerleave", () => {
    gallery.dataset.pointerActive = "false";
    showFrame(0, { activateVideo: true });
  });
  gallery.addEventListener("pointerup", () => {
    gallery.dataset.pointerActive = "false";
    showFrame(0, { activateVideo: true });
  });
  gallery.addEventListener("pointercancel", () => {
    gallery.dataset.pointerActive = "false";
    showFrame(0, { activateVideo: true });
  });
  gallery.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    showFrame(Number(gallery.dataset.galleryIndex || 0) + direction, { activateVideo: true });
  });

  gallery.dataset.initialized = "true";
  showFrame(0);
  return gallery;
}

function hydrateEntry(card) {
  const body = card.querySelector("[data-entry-body]");
  const contentHost = body.querySelector("[data-entry-content-host]");
  const desiredLanguage = card.dataset.hasBodyTranslation === "true" ? state.language : "ru";
  if (body.dataset.loaded === "true" && body.dataset.language === desiredLanguage) return body;

  const template = card.querySelector(`[data-entry-template][data-language="${desiredLanguage}"]`)
    || card.querySelector('[data-entry-template][data-language="ru"]');
  contentHost.replaceChildren();
  contentHost.append(template.content.cloneNode(true));
  contentHost.querySelectorAll("img").forEach((image) => {
    image.loading = "lazy";
    image.decoding = "async";
  });
  contentHost.querySelectorAll("video").forEach((video) => {
    video.preload = "metadata";
    video.playsInline = true;
  });
  body.dataset.loaded = "true";
  body.dataset.language = desiredLanguage;
  return body;
}

function ensureExpandedEntryIsVisible() {
  if (!state.expandedEntry) return;
  const matchingEntries = filterEntries(entries, state.mode);
  const entryIndex = matchingEntries.findIndex(({ id }) => id === state.expandedEntry);
  if (entryIndex < 0) {
    state = { ...state, expandedEntry: null };
    return;
  }

  const requiredCount = entryIndex + 1;
  if (requiredCount <= state.visibleCounts[state.mode]) return;
  state = {
    ...state,
    visibleCounts: {
      ...state.visibleCounts,
      [state.mode]: Math.ceil(requiredCount / BATCH_SIZE) * BATCH_SIZE,
    },
  };
}

function applyLanguage() {
  document.documentElement.lang = state.language;
  document.querySelectorAll("[data-copy-en][data-copy-ru]").forEach((element) => {
    const suffix = state.language === "ru" ? "Ru" : "En";
    element.textContent = element.dataset[`copy${suffix}`];
  });
  document.querySelectorAll("[data-aria-en][data-aria-ru]").forEach((element) => {
    const suffix = state.language === "ru" ? "Ru" : "En";
    element.setAttribute("aria-label", element.dataset[`aria${suffix}`]);
  });
  document.querySelectorAll(".entry-title").forEach((title) => {
    title.lang = state.language;
  });

  const languageParts = languageToggle.querySelectorAll("span:not([aria-hidden])");
  languageParts.forEach((part) => {
    part.classList.toggle("language-toggle__active", part.textContent.toLowerCase() === state.language);
  });
  document.title = state.language === "ru" ? "гера волобуев — дизайнер" : "gera volobuev — designer";

  try {
    window.localStorage.setItem("portfolio-language", state.language);
  } catch {
    // The site remains usable when storage is blocked.
  }
}

function render({ updateHistory = false, historyMode = "replace" } = {}) {
  ensureExpandedEntryIsVisible();
  const filteredEntries = filterEntries(entries, state.mode);
  const visibleEntries = getVisibleEntries(entries, state);
  const visibleIds = new Set(visibleEntries.map(({ id }) => id));

  entries.forEach(({ id, type, element }) => {
    const isVisible = type === state.mode && visibleIds.has(id);
    const isExpanded = isVisible && type === "note" && id === state.expandedEntry;
    element.hidden = !isVisible;
    element.classList.toggle("is-expanded", isExpanded);
    if (type === "project" && isVisible) buildProjectGallery(element);
    const noteLink = element.querySelector("[data-note-link]");
    if (!noteLink) return;
    noteLink.setAttribute("aria-expanded", String(isExpanded));
    noteLink.classList.toggle("is-visited", visitedNotes.has(id));

    const body = isExpanded ? hydrateEntry(element) : element.querySelector("[data-entry-body]");
    body.hidden = !isExpanded;
  });

  modeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.mode === state.mode));
  });

  modeTitle.textContent = copy[state.language].modeTitle[state.mode];
  const hasMore = visibleEntries.length < filteredEntries.length;
  endMessage.hidden = hasMore;
  applyLanguage();

  if (updateHistory) {
    const url = serializeView(state, window.location.pathname);
    window.history[`${historyMode}State`]({ mode: state.mode, entry: state.expandedEntry }, "", url);
  }
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.mode === state.mode) return;
    dispatch({ type: "SAVE_SCROLL", mode: state.mode, scrollTop: getScrollTop() });
    dispatch({ type: "SET_MODE", mode: button.dataset.mode });
    render({ updateHistory: true });
    requestAnimationFrame(() => restoreScrollTop(state.scrollPositions[state.mode]));
  });
});

stream.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-note-close]");
  if (closeButton) {
    const card = closeButton.closest("[data-entry]");
    dispatch({ type: "TOGGLE_ENTRY", entryId: card.dataset.entryId });
    render({ updateHistory: true, historyMode: "replace" });
    requestAnimationFrame(() => card.querySelector("[data-note-link]")?.focus());
    return;
  }

  const noteLink = event.target.closest("[data-note-link]");
  if (!noteLink) return;
  event.preventDefault();
  const card = noteLink.closest("[data-entry]");
  const wasExpanded = state.expandedEntry === card.dataset.entryId;
  markNoteVisited(card.dataset.entryId);
  dispatch({ type: "TOGGLE_ENTRY", entryId: card.dataset.entryId });
  render({ updateHistory: true, historyMode: wasExpanded ? "replace" : "push" });

  if (!wasExpanded) {
    requestAnimationFrame(() => card.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" }));
  }
});

languageToggle.addEventListener("click", () => {
  dispatch({ type: "SET_LANGUAGE", language: state.language === "en" ? "ru" : "en" });
  render();
});

window.addEventListener("popstate", () => {
  dispatch({ type: "HYDRATE_VIEW", search: window.location.search });
  render();
});

if ("IntersectionObserver" in window) {
  const mediaObserver = new IntersectionObserver((observations) => {
    observations.forEach(({ isIntersecting, target }) => {
      if (!isIntersecting || target.hidden) return;
      activateMedia(target);
      mediaObserver.unobserve(target);
    });
  }, { root: isDesktopLayout() ? streamPanel : null, rootMargin: "800px" });
  cards.forEach((card) => mediaObserver.observe(card));

  const galleryPreloadObserver = new IntersectionObserver((observations) => {
    observations.forEach(({ isIntersecting, target }) => {
      if (!isIntersecting || target.hidden) return;
      const gallery = buildProjectGallery(target);
      preloadGalleryImages(gallery);
      galleryPreloadObserver.unobserve(target);
    });
  }, { root: isDesktopLayout() ? streamPanel : null, rootMargin: "600px" });
  cards.filter((card) => card.dataset.entryType === "project")
    .forEach((card) => galleryPreloadObserver.observe(card));

  const observer = new IntersectionObserver((observations) => {
    if (!observations.some(({ isIntersecting }) => isIntersecting)) return;
    const total = filterEntries(entries, state.mode).length;
    if (state.visibleCounts[state.mode] >= total) return;
    dispatch({ type: "LOAD_MORE" });
    render();
  }, { root: isDesktopLayout() ? streamPanel : null, rootMargin: "300px" });
  observer.observe(sentinel);
} else {
  state = {
    ...state,
    visibleCounts: {
      project: filterEntries(entries, "project").length,
      note: filterEntries(entries, "note").length,
    },
  };
}

document.querySelectorAll('[data-cover-video][preload="auto"]').forEach(prepareCoverVideo);
render();

if (!("IntersectionObserver" in window)) {
  entries.forEach(({ element, type }) => {
    if (type === "project") preloadGalleryImages(buildProjectGallery(element));
    activateMedia(element);
  });
}

if (state.expandedEntry) {
  requestAnimationFrame(() => {
    document.querySelector(`#entry-${CSS.escape(state.expandedEntry)}`)?.scrollIntoView({ block: "start" });
  });
}
