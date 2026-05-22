import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deriveTitle,
  formatItemLine,
  formatItemsList,
  isValidUrl,
  parseInputValue,
} from "../dist-test/format.js";

test("isValidUrl accepts http and https", () => {
  assert.equal(isValidUrl("https://example.com/path"), true);
  assert.equal(isValidUrl("http://localhost:3000"), true);
  assert.equal(isValidUrl("not a url"), false);
  assert.equal(isValidUrl(""), false);
});

test("deriveTitle builds host and path label", () => {
  assert.equal(
    deriveTitle("https://www.github.com/user/repo"),
    "github.com/user/repo"
  );
});

test("parseInputValue returns link for URLs", () => {
  const item = parseInputValue("https://example.com/docs");
  assert.ok(item);
  assert.equal(item.type, "link");
  assert.equal(item.url, "https://example.com/docs");
});

test("parseInputValue returns note for plain text", () => {
  const item = parseInputValue("Follow up tomorrow");
  assert.ok(item);
  assert.equal(item.type, "note");
  assert.equal(item.body, "Follow up tomorrow");
});

test("formatItemLine for tab uses title and full url", () => {
  const line = formatItemLine({
    id: "1",
    type: "tab",
    title: "Example Docs",
    url: "https://example.com/docs",
    savedAt: Date.UTC(2026, 2, 5),
  });
  assert.equal(line, "Example Docs | https://example.com/docs");
});

test("formatItemLine for link uses title and full url", () => {
  const line = formatItemLine({
    id: "2",
    type: "link",
    title: "github.com/user/repo",
    url: "https://github.com/user/repo",
    savedAt: 0,
  });
  assert.equal(line, "github.com/user/repo | https://github.com/user/repo");
});

test("formatItemLine for note uses body text only", () => {
  const line = formatItemLine({
    id: "3",
    type: "note",
    title: "Reminder",
    body: "Call the client",
    savedAt: 0,
  });
  assert.equal(line, "Call the client");
});

test("formatItemsList joins lines", () => {
  const text = formatItemsList([
    {
      id: "1",
      type: "note",
      title: "A",
      body: "First",
      savedAt: 0,
    },
    {
      id: "2",
      type: "link",
      title: "example.com",
      url: "https://example.com",
      savedAt: 0,
    },
  ]);
  assert.equal(text, "First\nexample.com | https://example.com");
});
