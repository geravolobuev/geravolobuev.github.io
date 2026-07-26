import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

const postsUrl = new URL("../_posts/", import.meta.url);
const baseline = JSON.parse(
  await readFile(new URL("./fixtures/note-content-baseline.json", import.meta.url), "utf8"),
);

const extractBody = (source) => {
  const match = source.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  return match?.[1] ?? "";
};

const canonicalContent = (body) => body
  .replace(/<\/?span\b[^>]*>/gi, "")
  .split(/\r?\n/)
  .filter((line) => !/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line))
  .map((line) => line
    .replace(/^\s*#{1,6}\s+/, "")
    .replace(/\s+#{1,6}\s*$/, "")
    .replace(/^(\s*\d+)\.\s+-\s+/, "$1 - ")
    .replace(/^\s*[-+*]\s+/, "")
    .replace(/^\s*\d+\\?[.)]\s+/, "")
    .replace(/^\s*>\s?/, "")
    .trim())
  .join(" ")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/\u00a0/g, " ")
  .replace(/\\([.)#*_[\]-])/g, "$1")
  .replace(/[*_~`]/g, "")
  .replace(/\s+/g, " ")
  .trim();

const digest = (value) => createHash("sha256").update(value).digest("hex");
const filenames = (await readdir(postsUrl))
  .filter((name) => name.endsWith(".md"))
  .sort();

test("all notes retain their original textual content", async () => {
  assert.equal(filenames.length, 61);
  assert.deepEqual(Object.keys(baseline).sort(), filenames);

  for (const filename of filenames) {
    const source = await readFile(new URL(filename, postsUrl), "utf8");
    assert.equal(
      digest(canonicalContent(extractBody(source))),
      baseline[filename],
      `${filename} changed textual content`,
    );
  }
});

test("all notes follow one clean Markdown structure", async () => {
  for (const filename of filenames) {
    const source = await readFile(new URL(filename, postsUrl), "utf8");
    const body = extractBody(source);
    const firstContentLine = body.split(/\r?\n/).find((line) => line.trim());

    assert.match(firstContentLine ?? "", /^# [^#]/, `${filename} needs one clear H1 title`);
    assert.equal((body.match(/^# [^#]/gm) ?? []).length, 1, `${filename} has multiple H1 titles`);
    assert.doesNotMatch(body, /^#{4,}\s/m, `${filename} uses headings deeper than H3`);
    assert.doesNotMatch(body, /^#{1,3}\s+.*\s+#+\s*$/m, `${filename} uses closing heading hashes`);
    assert.doesNotMatch(body, /<\/?span\b/i, `${filename} contains decorative span HTML`);
    assert.doesNotMatch(body, /^\s*[*+]\s+/m, `${filename} uses inconsistent bullet markers`);
    assert.doesNotMatch(body, /^\s*\d+\\[.)]\s+/m, `${filename} escapes ordered-list markers`);
    assert.doesNotMatch(body, /^\s*\d+\.\s+-\s+/m, `${filename} mixes ordered-list and dash markers`);
    assert.doesNotMatch(body, /^\s*(?:---+|\*\*\*+|___+)\s*$/m, `${filename} uses decorative rules`);
    assert.doesNotMatch(body, /^\s*\*\*\s*$/m, `${filename} contains an orphan bold marker`);
    assert.doesNotMatch(
      body,
      /(?<![!\\])\[[^\]\n]+\](?!\s*(?:\(|\[|:))/,
      `${filename} contains bracketed text that Kramdown treats as an unresolved reference`,
    );
    assert.equal(
      (body.match(/\*\*/g) ?? []).length % 2,
      0,
      `${filename} contains an unpaired bold marker`,
    );
    assert.doesNotMatch(body, /\t/, `${filename} contains tabs`);
    assert.doesNotMatch(body, /[ \t]+$/m, `${filename} contains trailing whitespace`);
    assert.doesNotMatch(body, /\n{3,}/, `${filename} contains excessive blank lines`);
    assert.doesNotMatch(body, /^(#{1,3}\s+.+)\n(?!\n|$)/m, `${filename} needs space after headings`);
    assert.doesNotMatch(body, /[^\n]\n#{1,3}\s+/m, `${filename} needs space before headings`);
  }
});

test("semantic numbers in the benefits ladder remain intact", async () => {
  const filename = "2020-07-16-основы-брендинга-1.md";
  const source = await readFile(new URL(filename, postsUrl), "utf8");

  assert.match(
    extractBody(source),
    /4 - эмоциональное\n3 - функциональное\n2 - продуктовое\n1 - атрибуты/,
    `${filename} must retain the original descending 4–1 scale`,
  );
});

test("emphasis in The Goal remains attached to the intended phrases", async () => {
  const filename = "2021-05-31-goldratt-goal.md";
  const source = await readFile(new URL(filename, postsUrl), "utf8");
  const body = extractBody(source);

  assert.match(
    body,
    /Сначала вы должны сформулировать свою цель с позиции этих показателей: \*\*Повышать проток при одновременном снижении запасов и операционных расходов\.\*\*/,
  );
  assert.match(
    body,
    /— А следствием этих правил является то, что \*\*вы не должны стремиться оптимизировать каждый ресурс системы\.\*\*/,
  );
  assert.match(
    body,
    /означает, что \*\*«узкие места» предопределяют как уровень незавершенного производства, так и протока\.\*\*/,
  );
});
