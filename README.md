# geravolobuev.ru

One-page portfolio and notes archive built with Jekyll and hosted on GitHub Pages.

## Content model

The homepage combines two Jekyll collections into one stream:

- Files in `_projects/` are shown as `#project` entries in **Works** mode.
- Files in `_posts/` are shown as `#note` entries in **Notes** mode.

Works are shown by default. Filtering, linked inline note reading, automatic infinite loading, URL state, and EN/RU interface switching all run in the browser without a page refresh.

## Add a note

Create `_posts/YYYY-MM-DD-your-note.md`:

```yaml
---
layout: post
title: "Название заметки"
titleEn: "Note title"
date: 2026-07-19 12:00:00 +0000
lang: ru
---

Напишите русскую версию заметки в Markdown здесь.
```

Then create the paired translation at `_note_translations/YYYY-MM-DD-your-note-en.md`:

```yaml
---
translation_of: your-note
lang: en
---

Write the complete English translation in Markdown here.
```

`title`, `titleEn`, and an explicit source `lang` are required. Every note must have one complete counterpart in `_note_translations/`, identified by `translation_of` and the opposite `lang`. The browser keeps both rendered versions in inert templates and swaps the expanded body instantly without refreshing the page.

Use a consistent Markdown hierarchy: the card title is the article title, so the body should begin with prose or its first `##` section rather than repeat the title. Use `##` for sections, `###` for subsections, standard `-` bullets and `1.` ordered lists, one blank line between blocks, and Markdown emphasis/quotes instead of decorative HTML.

## Add a project

Create `_projects/YYYY-MM-DD-project-name.md`:

```yaml
---
layout: project
title: "Название проекта"
titleEn: "Project title"
date: 2026-07-19 12:00:00 +0000
preview: /uploads/project-name/preview.webp
video: /uploads/project-name/reel.mp4
---

![first gallery image](/uploads/project-name/01.webp)
![second gallery image](/uploads/project-name/02.webp)
```

Project cards use `video` as the first cover frame, or `preview` when there is no video. For video projects, `preview` is retained as an error fallback rather than shown as a low-resolution poster. Every Markdown image in the project body becomes another gesture-controlled gallery frame. `titleEn` is required; `preview` and `video` are optional. Put local media in a dedicated folder under `uploads/`. Compress large images before committing; use embedded video platforms for long-form video.

The gallery uses a stable 16:9 black canvas and `object-fit: contain`. Landscape, square, and portrait media therefore keep their original proportions and are never cropped; unused canvas space remains black.

The first project video starts loading immediately; upcoming cover videos and gallery images begin loading before their projects enter the viewport. A cover is revealed only after the browser decodes a full-quality video frame. The site also warms the connection to Dropbox. For the fastest result, avoid remote Dropbox redirects: export gallery images as AVIF or WebP near their displayed dimensions, keep each image ideally below 300–500 KB, store them under `uploads/`, and use local paths. Keep cover videos short, muted, and compressed; provide a lightweight WebP/AVIF `preview` as the failure fallback.

## Local development

```bash
bundle install
bundle exec jekyll serve
```

Use Ruby 3 or newer, then open `http://127.0.0.1:4000`.

## Verification

```bash
npm test
bundle exec jekyll build
npm run test:site
```

The JavaScript state module has unit coverage for filtering, progressive rendering, inline expansion state, URL state, and localization. The site contract tests verify that all current projects and notes appear in the generated homepage.
