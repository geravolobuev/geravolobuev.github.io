const modal = document.querySelector("[data-note-modal]");
const modalPanel = document.querySelector("[data-note-modal-panel]");
const modalContent = document.querySelector("[data-note-modal-content]");
const modalTitle = document.querySelector("[data-note-modal-title]");
const modalClose = document.querySelector("[data-note-modal-close]");
const page = document.querySelector(".wrapper");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(pointer: fine)");
const noteCache = new Map();

let lastFocused;
let requestToken = 0;
let modalScrollCleanup = () => {};
let modalTransitionTimer = 0;

const revealElements = (container, root = null) => {
  const elements = [...container.querySelectorAll("[data-reveal]")];
  if (!elements.length) return;

  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    const entering = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

    entering.forEach((entry, index) => {
      entry.target.style.setProperty("--reveal-delay", `${Math.min(index * 70, 280)}ms`);
      requestAnimationFrame(() => entry.target.classList.add("is-visible"));
      observer.unobserve(entry.target);
    });
  }, {
    root,
    rootMargin: "0px 0px -8% 0px",
    threshold: 0.05,
  });

  elements.forEach((element) => observer.observe(element));
};

const installInertialScroll = (scroller = window) => {
  if (reducedMotion.matches || !finePointer.matches) return () => {};

  const isWindow = scroller === window;
  if (isWindow) document.documentElement.classList.add("inertial-scroll");
  const read = () => (isWindow ? window.scrollY : scroller.scrollTop);
  const maximum = () => {
    if (isWindow) {
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }
    return Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  };
  const write = (value) => {
    if (isWindow) window.scrollTo(0, value);
    else scroller.scrollTo(0, value);
  };

  let current = read();
  let target = current;
  let frame = 0;

  const animate = () => {
    current += (target - current) * 0.115;
    write(current);

    if (Math.abs(target - current) > 0.35) {
      frame = requestAnimationFrame(animate);
    } else {
      write(target);
      frame = 0;
    }
  };

  const onWheel = (event) => {
    if (event.defaultPrevented || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    event.preventDefault();

    if (!frame) {
      current = read();
      target = current;
    }
    const multiplier = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? window.innerHeight : 1;
    target = Math.max(0, Math.min(maximum(), target + event.deltaY * multiplier));
    if (!frame) {
      frame = requestAnimationFrame(animate);
    }
  };

  scroller.addEventListener("wheel", onWheel, { passive: false });
  return () => {
    scroller.removeEventListener("wheel", onWheel);
    if (frame) cancelAnimationFrame(frame);
    if (isWindow) document.documentElement.classList.remove("inertial-scroll");
  };
};

const normalizeEmbeddedUrls = (container, baseUrl) => {
  container.querySelectorAll("[src], [href]").forEach((element) => {
    const attribute = element.hasAttribute("src") ? "src" : "href";
    const value = element.getAttribute(attribute);
    if (!value || value.startsWith("#") || /^(?:mailto|tel):/i.test(value)) return;

    const resolved = new URL(value, baseUrl);
    const allowedProtocols = attribute === "src"
      ? new Set(["http:", "https:", "data:"])
      : new Set(["http:", "https:"]);
    if (!allowedProtocols.has(resolved.protocol)) {
      element.removeAttribute(attribute);
      return;
    }
    element.setAttribute(attribute, resolved.href);
  });
};

const loadNote = async (href) => {
  if (noteCache.has(href)) return noteCache.get(href).cloneNode(true);

  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin) throw new Error("Only local notes can open in the modal");

  const requestOptions = {
    headers: { "X-Requested-With": "note-modal" },
  };
  let response = await fetch(url, requestOptions);
  if (!response.ok && !url.pathname.endsWith(".html")) {
    const localBuildUrl = new URL(`${url.pathname}.html`, url);
    response = await fetch(localBuildUrl, requestOptions);
  }
  if (!response.ok) throw new Error(`Unable to load note: ${response.status}`);

  const documentFragment = new DOMParser().parseFromString(await response.text(), "text/html");
  const article = documentFragment.querySelector(".blog-post article");
  if (!article) throw new Error("Unable to find note content");

  const container = document.createElement("div");
  container.className = "note-modal__article";
  container.append(article.cloneNode(true));

  const footer = documentFragment.querySelector(".blog-post footer");
  if (footer) container.append(footer.cloneNode(true));

  container.querySelectorAll("script").forEach((element) => element.remove());
  container.querySelectorAll("*").forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      if (attribute.name.toLowerCase().startsWith("on")) {
        element.removeAttribute(attribute.name);
      }
    });
  });
  normalizeEmbeddedUrls(container, response.url);
  noteCache.set(href, container);
  return container.cloneNode(true);
};

const markModalReveals = (container) => {
  container.querySelectorAll("h2, h3, h4, p, li, blockquote, img, video").forEach((element) => {
    element.setAttribute("data-reveal", "");
  });
};

const showModal = () => {
  if (!modal || !page) return;
  window.clearTimeout(modalTransitionTimer);
  lastFocused = document.activeElement;
  modal.hidden = false;
  page.inert = true;
  document.documentElement.classList.add("note-modal-open");
  document.body.classList.add("note-modal-open");
  requestAnimationFrame(() => {
    modal.classList.add("is-open");
    modalClose?.focus();
  });
};

const finishModalClose = () => {
  if (!modal || modal.classList.contains("is-open")) return;
  modal.hidden = true;
  page.inert = false;
  document.documentElement.classList.remove("note-modal-open");
  document.body.classList.remove("note-modal-open");
  modalScrollCleanup();
  modalScrollCleanup = () => {};
  lastFocused?.focus?.();
};

const hideModal = () => {
  if (!modal || modal.hidden) return;
  requestToken += 1;
  window.clearTimeout(modalTransitionTimer);
  modal.classList.remove("is-open");
  modalTransitionTimer = window.setTimeout(
    finishModalClose,
    reducedMotion.matches ? 0 : 500,
  );
};

const openNote = async (href, updateHistory = true) => {
  if (!modalContent || !modalTitle || !modalPanel) return;
  const noteUrl = new URL(href, window.location.href);
  const localHref = `${noteUrl.pathname}${noteUrl.search}`;
  const token = ++requestToken;
  showModal();
  modalContent.setAttribute("aria-busy", "true");
  const loading = document.createElement("p");
  loading.className = "note-modal__loading";
  loading.setAttribute("role", "status");
  loading.textContent = "loading…";
  modalContent.replaceChildren(loading);
  modalTitle.textContent = "note";
  modalPanel.scrollTop = 0;

  if (updateHistory) {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("note", localHref);
    history.pushState({ noteModal: true, fromPage: true, href: localHref }, "", nextUrl);
  }

  try {
    const article = await loadNote(localHref);
    if (token !== requestToken) return;

    const heading = article.querySelector("h2, h1");
    modalTitle.textContent = heading?.textContent?.trim() || "note";
    markModalReveals(article);
    modalContent.replaceChildren(article);
    modalContent.removeAttribute("aria-busy");
    revealElements(modalContent, modalPanel);
    modalScrollCleanup();
    modalScrollCleanup = installInertialScroll(modalPanel);
  } catch {
    if (token !== requestToken) return;
    const message = document.createElement("p");
    const fallbackLink = document.createElement("a");
    fallbackLink.href = new URL(localHref, window.location.href).href;
    fallbackLink.textContent = "open the original page";
    message.append("couldn’t load this note. ", fallbackLink, ".");
    modalContent.replaceChildren(message);
    modalContent.removeAttribute("aria-busy");
  }
};

const closeModalFromControl = () => {
  if (history.state?.noteModal && history.state?.fromPage) {
    history.back();
    return;
  }

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.delete("note");
  history.replaceState(null, "", nextUrl);
  hideModal();
};

const trapModalFocus = (event) => {
  if (event.key !== "Tab" || !modal || modal.hidden) return;

  const focusable = [...modal.querySelectorAll(
    "a[href], button:not([disabled]), iframe, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
  )].filter((element) => element.getClientRects().length > 0);
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (focusable.length === 1) {
    event.preventDefault();
    first.focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

document.addEventListener("click", (event) => {
  const link = event.target.closest?.("[data-note-link]");
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  openNote(link.href);
});

modalClose?.addEventListener("click", () => {
  closeModalFromControl();
});

modal?.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModalFromControl();
  }
});

document.addEventListener("keydown", (event) => {
  trapModalFocus(event);
  if (event.key === "Escape" && modal && !modal.hidden) {
    closeModalFromControl();
  }
});

window.addEventListener("popstate", () => {
  const href = new URL(window.location.href).searchParams.get("note");
  if (href) openNote(href, false);
  else hideModal();
});

clearTimeout(window.__revealFallback);
requestAnimationFrame(() => {
  revealElements(document);
  installInertialScroll(window);
});

const initialNote = new URL(window.location.href).searchParams.get("note");
if (initialNote) {
  history.replaceState({ noteModal: true, fromPage: false, href: initialNote }, "", window.location.href);
  openNote(initialNote, false);
}
