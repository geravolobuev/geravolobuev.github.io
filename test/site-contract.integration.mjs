import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const index = await readFile(new URL("../_site/index.html", import.meta.url), "utf8");

test("generated homepage contains the unified portfolio contract", () => {
  assert.match(index, /data-mode="project" aria-pressed="true"/);
  assert.match(index, /data-mode="note" aria-pressed="false"/);
  assert.match(index, /data-entry-type="project"/);
  assert.match(index, /data-entry-type="note"/);
  assert.match(index, /data-entry-template/);
  assert.match(index, /data-end-message/);
  assert.doesNotMatch(index, /data-load-more/);
  assert.match(index, /type="module" src="\/assets\/js\/portfolio\.js\?v=2"/);
});

test("cards show titles without summaries and projects use scrub galleries", () => {
  assert.doesNotMatch(index, /class="entry-summary"/);
  assert.doesNotMatch(index, /scented candles branding/i);
  assert.match(index, /data-project-gallery/);
  assert.match(index, /data-project-media-template/);

  const projects = (index.match(/<article[\s\S]*?<\/article>/g) ?? [])
    .filter((article) => article.includes('data-entry-type="project"'));
  assert.equal(projects.length, 11);
  projects.forEach((project) => assert.doesNotMatch(project, /data-entry-toggle/));
});

test("homepage preserves the bilingual about copy, authored line breaks, and contact order", () => {
  const profileCopy = index.match(/<div class="profile__copy">[\s\S]*?<\/div>/)?.[0] ?? "";
  assert.match(profileCopy, /hi! 👋 i’m gera!<\/span><br>/);
  assert.match(profileCopy, /a multidisciplinary designer\.<\/span><br>/);
  assert.match(profileCopy, /I create ideas, brands, processes<\/span><br>/);
  assert.match(profileCopy, /and products to spark impactful<\/span><br>/);
  assert.match(profileCopy, /human experiences\.<\/span><br>/);
  assert.match(profileCopy, /currently at<\/span>/);
  assert.doesNotMatch(profileCopy, /currently 💼 at|сейчас 💼 в/);
  assert.match(profileCopy, /renaissance bank, gazprom, t2,<\/span><br>/);
  assert.match(profileCopy, /avito, adamas, vk, russian post,<\/span><br>/);
  assert.match(profileCopy, /mvideo-eldorado group, severstal<\/span>/);
  assert.match(profileCopy, /я создаю идеи, бренды, процессы/);
  assert.match(profileCopy, /ренессанс Банк, газпром, т2,/);
  assert.ok(profileCopy.indexOf("selected clients") < profileCopy.indexOf("we can 🤝 via"));
  assert.match(profileCopy, /class="profile__contact"/);
  assert.match(index, /href="mailto:fromgayva@gmail\.com"/);
  assert.match(index, /href="http:\/\/www\.linkedin\.com\/in\/geravolobuev"/);
  assert.equal((index.match(/mailto:fromgayva@gmail\.com/g) ?? []).length, 1);
  assert.equal((index.match(/www\.linkedin\.com\/in\/geravolobuev/g) ?? []).length, 1);
  assert.doesNotMatch(index, /class="contact-links"/);

  const streamPanel = index.match(/<section class="stream-panel"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.match(streamPanel, /💼 works/);
  assert.match(streamPanel, /✍🏻 notes/);
  assert.match(streamPanel, /class="mode-switcher"/);
});

test("homepage typography follows the reference text scale and lowercase treatment", async () => {
  const css = await readFile(new URL("../assets/css/portfolio.css", import.meta.url), "utf8");
  assert.match(index, /fonts\.googleapis\.com\/css2\?family=Inter/);
  assert.match(css, /font-family:\s*"Inter",\s*sans-serif/);
  assert.doesNotMatch(css, /Gera Sans|HelveticaNeueCyr-Roman/);
  assert.match(css, /--display-size:\s*25\.2px/);
  assert.match(css, /--display-leading:\s*28\.98px/);
  assert.match(css, /\.portfolio-page\s*\{[^}]*text-transform:\s*lowercase/s);
});

test("desktop proportions and stream styling follow the simplified layout", async () => {
  const css = await readFile(new URL("../assets/css/portfolio.css", import.meta.url), "utf8");
  assert.match(css, /--about-width:\s*25ch/);
  assert.match(css, /grid-template-columns:\s*var\(--about-width\) minmax\(0, 1fr\)/);
  assert.doesNotMatch(css, /\.contact-links\s*\{/);
  assert.match(css, /\.entry-title,[\s\S]*\.entry-content\s*\{[^}]*max-width:\s*none/s);
  assert.doesNotMatch(css, /\.stream-entry\s*\{[^}]*border-bottom/s);
  assert.doesNotMatch(css, /\.profile\s*\{[^}]*border-right/s);
});

test("spacing uses the measured vladzely rhythm", async () => {
  const css = await readFile(new URL("../assets/css/portfolio.css", import.meta.url), "utf8");
  assert.match(css, /--page-y:\s*10px/);
  assert.match(css, /--page-x:\s*11px/);
  assert.match(css, /--column-gap:\s*30px/);
  assert.match(css, /--media-gap:\s*10px/);
  assert.match(css, /--entry-gap:\s*30px/);
  assert.match(css, /body\s*\{[^}]*margin:\s*var\(--page-y\) var\(--page-x\)/s);
  assert.match(css, /\.portfolio-shell\s*\{[^}]*column-gap:\s*var\(--column-gap\)/s);
});

test("all visible text uses the about typography", async () => {
  const css = await readFile(new URL("../assets/css/portfolio.css", import.meta.url), "utf8");
  assert.match(css, /body\s*\{[^}]*font-size:\s*var\(--display-size\)[^}]*line-height:\s*var\(--display-leading\)/s);
  assert.doesNotMatch(css, /font-size:\s*(?:12px|14px|0\.7em)/);
});

test("gallery media preserves intrinsic proportions on black", async () => {
  const css = await readFile(new URL("../assets/css/portfolio.css", import.meta.url), "utf8");
  assert.match(css, /\.entry-hero\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/s);
  assert.match(css, /\.entry-hero\s*\{[^}]*background:\s*#000/s);
  assert.match(css, /\.entry-hero img,[\s\S]*\.entry-hero video\s*\{[^}]*object-fit:\s*contain/s);
  assert.doesNotMatch(css, /object-fit:\s*cover/);
});

test("entry hashtag labels are removed", () => {
  assert.doesNotMatch(index, /class="entry-tag"/);
});

test("notes are inline blue links without read buttons", async () => {
  assert.equal(index.match(/data-note-link/g)?.length, 61);
  assert.doesNotMatch(index, /data-entry-toggle/);
  assert.doesNotMatch(index, />read note</);
  assert.equal(index.match(/data-note-close/g)?.length, 61);
  assert.match(index, /data-note-close[^>]*data-aria-en="close note"[^>]*>×<\/button>/);

  const css = await readFile(new URL("../assets/css/portfolio.css", import.meta.url), "utf8");
  assert.match(css, /--web-blue:\s*#0000ee/i);
  assert.match(css, /--visited-link:\s*#551a8b/i);
  assert.match(css, /\.entry-title-link:visited\s*\{[^}]*color:\s*var\(--visited-link\)/s);
  assert.match(css, /\.entry-title-link\.is-visited[^{]*\{[^}]*color:\s*var\(--visited-link\)/s);
});

test("project dates stay under covers while note dates end expanded notes", () => {
  const articles = index.match(/<article[\s\S]*?<\/article>/g) ?? [];
  const project = articles.find((article) => article.includes('data-entry-type="project"')) ?? "";
  const note = articles.find((article) => article.includes('data-entry-type="note"')) ?? "";
  assert.ok(project.indexOf("data-project-gallery") < project.indexOf('class="entry-header"'));
  assert.match(project, /class="entry-title"[\s\S]*?<time /);
  const noteHeader = note.match(/<header class="entry-header">[\s\S]*?<\/header>/)?.[0] ?? "";
  assert.doesNotMatch(noteHeader, /<time /);
  assert.match(note, /<div class="entry-content"[^>]*>[\s\S]*<time class="entry-date entry-date--note"/);
});

test("dates use the primary black text color", async () => {
  const css = await readFile(new URL("../assets/css/portfolio.css", import.meta.url), "utf8");
  assert.match(css, /\.entry-date\s*\{[^}]*color:\s*var\(--ink\)/s);
});

test("mode totals and manual pagination controls are removed", () => {
  assert.doesNotMatch(index, /mode-button__count/);
  assert.doesNotMatch(index, /data-stream-status/);
  assert.doesNotMatch(index, /data-load-more/);
});

test("gallery reset and near-viewport preloading are wired", async () => {
  const js = await readFile(new URL("../assets/js/portfolio.js", import.meta.url), "utf8");
  assert.match(js, /addEventListener\("pointerleave"[\s\S]*showFrame\(0/s);
  assert.match(js, /function preloadGalleryImages/);
  assert.match(js, /addEventListener\("loadeddata"[\s\S]*classList\.add\("is-ready"/s);
  assert.match(js, /video\.preload\s*=\s*"auto"/);
  assert.match(js, /rootMargin:\s*"800px"/);
  assert.match(js, /rootMargin:\s*"600px"/);
  assert.match(index, /rel="preconnect" href="https:\/\/www\.dropbox\.com"/);
});

test("every remaining card has an authored English title", () => {
  assert.equal(index.match(/data-has-title-translation="true"/g)?.length, 72);
  assert.doesNotMatch(index, /data-has-title-translation="false"/);
});

test("every note has complete Russian and English bodies", () => {
  const notes = (index.match(/<article[\s\S]*?<\/article>/g) ?? [])
    .filter((article) => article.includes('data-entry-type="note"'));
  assert.equal(notes.length, 61);
  notes.forEach((note) => {
    assert.match(note, /data-has-body-translation="true"/);
    assert.match(note, /data-entry-template data-language="ru"/);
    assert.match(note, /data-entry-template data-language="en"/);
  });
  assert.equal(index.match(/data-has-body-translation="true"/g)?.length, 61);
});

test("note sources and translations satisfy the bilingual content contract", async () => {
  const postsUrl = new URL("../_posts/", import.meta.url);
  const translationsUrl = new URL("../_note_translations/", import.meta.url);
  const postFiles = (await readdir(postsUrl)).filter((name) => name.endsWith(".md"));
  const translationFiles = (await readdir(translationsUrl)).filter((name) => name.endsWith(".md"));
  assert.equal(postFiles.length, 61);
  assert.equal(translationFiles.length, 61);

  const translations = await Promise.all(translationFiles.map(async (name) => ({
    name,
    text: await readFile(new URL(name, translationsUrl), "utf8"),
  })));

  for (const postFile of postFiles) {
    const post = await readFile(new URL(postFile, postsUrl), "utf8");
    const sourceLanguage = post.match(/^lang:\s*(ru|en)\s*$/m)?.[1];
    const slug = postFile.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
    assert.ok(sourceLanguage, `${postFile} must declare lang: ru or lang: en`);
    if (sourceLanguage === "en") {
      assert.match(post, /^titleRu:\s*.+$/m, `${postFile} must declare a Russian title`);
    }

    const matches = translations.filter(({ text }) => (
      text.match(/^translation_of:\s*(.+?)\s*$/m)?.[1] === slug
    ));
    assert.equal(matches.length, 1, `${postFile} must have exactly one translation`);
    const targetLanguage = matches[0].text.match(/^lang:\s*(ru|en)\s*$/m)?.[1];
    assert.notEqual(targetLanguage, sourceLanguage, `${matches[0].name} must use the opposite language`);
  }
});

test("all existing projects and notes are represented", () => {
  assert.equal(index.match(/data-entry-type="project"/g)?.length, 11);
  assert.equal(index.match(/data-entry-type="note"/g)?.length, 61);
});

test("project videos are lazy until their cards become visible", () => {
  assert.equal(index.match(/<source data-src=/g)?.length, 10);
  assert.equal(index.match(/<source src="https:\/\/www\.dropbox\.com/g)?.length, 1);
  assert.match(index, /<video[^>]*preload="auto"[^>]*data-cover-video/);
  assert.doesNotMatch(index, /<video[^>]*poster=/);
  assert.equal(index.match(/data-video-fallback/g)?.length, 11);
  assert.match(index, /data-video-fallback[^>]*data-src="https:\/\/www\.dropbox\.com/);
});

test("expanded notes expose a delegated close action", async () => {
  const js = await readFile(new URL("../assets/js/portfolio.js", import.meta.url), "utf8");
  assert.match(js, /closest\("\[data-note-close\]"\)/);
  assert.match(js, /data-note-close[\s\S]*TOGGLE_ENTRY/s);
});

test("expanded notes keep text close to the title and fix the close control in the stream center", async () => {
  const css = await readFile(new URL("../assets/css/portfolio.css", import.meta.url), "utf8");
  assert.match(css, /\.stream-entry--note\.is-expanded\s*\{[^}]*animation:\s*none/s);
  assert.match(css, /\.stream-entry--note\.is-expanded \.entry-header\s*\{[^}]*margin-bottom:\s*var\(--media-gap\)/s);
  assert.match(css, /\.entry-close\s*\{[^}]*position:\s*fixed[^}]*bottom:\s*var\(--page-y\)[^}]*left:\s*calc\(50vw \+ 12\.5ch \+ 15px\)[^}]*transform:\s*translateX\(-50%\)/s);
  assert.doesNotMatch(css, /\.entry-close\s*\{[^}]*margin:\s*0 0 var\(--entry-gap\)/s);
});

test("cover videos fall back to their preview only on playback failure", async () => {
  const js = await readFile(new URL("../assets/js/portfolio.js", import.meta.url), "utf8");
  assert.match(js, /addEventListener\("error"[\s\S]*data-video-fallback/s);
  assert.match(js, /fallback\.src\s*=\s*fallback\.dataset\.src/);
});

test("mobile keeps the desktop profile copy width", async () => {
  const css = await readFile(new URL("../assets/css/portfolio.css", import.meta.url), "utf8");
  assert.match(css, /\.profile__intro,\s*\.profile__clients,\s*\.profile__contact\s*\{[^}]*width:\s*var\(--about-width\)[^}]*max-width:\s*none/s);
  const mobile = css.match(/@media \(max-width:\s*760px\)\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.doesNotMatch(mobile, /\.profile__intro,[\s\S]*max-width:\s*100%/);
});

test("bundle lock matches the managed GitHub Pages runtime", async () => {
  const gemfile = await readFile(new URL("../Gemfile", import.meta.url), "utf8");
  const lockfile = await readFile(new URL("../Gemfile.lock", import.meta.url), "utf8");
  assert.match(gemfile, /gem "github-pages", "~> 232"/);
  assert.match(lockfile, /github-pages \(232\)/);
  assert.match(lockfile, /jekyll \(3\.10\.0\)/);
  assert.match(lockfile, /jekyll-sass-converter \(1\.5\.2\)/);
  assert.match(lockfile, /PLATFORMS[\s\S]*x86_64-linux/);
});
