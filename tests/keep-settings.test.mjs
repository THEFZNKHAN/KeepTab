import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getKeepNoteTarget,
  normalizeKeepSettings,
  parseKeepNoteId,
} from "../dist-test/keep-settings.js";

test("parseKeepNoteId extracts id from LIST hash URL", () => {
  assert.equal(
    parseKeepNoteId(
      "https://keep.google.com/u/0/#LIST/1vOq_nsNuaC7HtFeKuzCI_AaGu-MD4YIAN4XpCY-lLkgRZUVq-Jug6cb07iUMKg"
    ),
    "1vOq_nsNuaC7HtFeKuzCI_AaGu-MD4YIAN4XpCY-lLkgRZUVq-Jug6cb07iUMKg"
  );
});

test("normalizeKeepSettings parses note id from URL", () => {
  const settings = normalizeKeepSettings({
    enabled: true,
    noteUrl: "https://keep.google.com/#LIST/board-id",
  });

  assert.equal(settings.enabled, true);
  assert.equal(settings.noteId, "board-id");
});

test("getKeepNoteTarget returns note when configured", () => {
  const settings = normalizeKeepSettings({
    enabled: true,
    noteUrl: "https://keep.google.com/#LIST/board-id",
  });

  const target = getKeepNoteTarget(settings);
  assert.equal(target?.noteId, "board-id");
  assert.equal(target?.noteUrl, settings.noteUrl);
});

test("getKeepNoteTarget returns null when note URL missing", () => {
  assert.equal(getKeepNoteTarget({ enabled: true }), null);
});
