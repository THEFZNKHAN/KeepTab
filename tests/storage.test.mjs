import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  dedupeKey,
  normalizeUrl,
  saveItem,
  getAllItems,
  clearAll,
} from "../dist-test/storage.js";

const store = new Map();

globalThis.chrome = {
  storage: {
    local: {
      get: async (key) => {
        if (typeof key === "string") {
          return store.has(key) ? { [key]: store.get(key) } : {};
        }
        return Object.fromEntries(store);
      },
      set: async (data) => {
        for (const [key, value] of Object.entries(data)) {
          store.set(key, value);
        }
      },
    },
  },
  action: {
    setBadgeText: async () => {},
    setBadgeBackgroundColor: async () => {},
  },
};

beforeEach(async () => {
  store.clear();
  await clearAll();
});

test("dedupeKey normalizes URLs for tab and link", () => {
  assert.equal(
    dedupeKey({
      type: "link",
      title: "A",
      url: "https://Example.com/path/",
    }),
    dedupeKey({
      type: "link",
      title: "B",
      url: "https://example.com/path",
    })
  );
});

test("normalizeUrl strips trailing slash and lowercases host", () => {
  assert.equal(
    normalizeUrl("https://Example.com/docs/"),
    "https://example.com/docs"
  );
});

test("saveItem deduplicates identical links", async () => {
  const first = await saveItem({
    type: "link",
    title: "example.com",
    url: "https://example.com/",
  });
  const second = await saveItem({
    type: "link",
    title: "example.com",
    url: "https://example.com",
  });

  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal((await getAllItems()).length, 1);
});

test("saveItem deduplicates notes by body", async () => {
  await saveItem({ type: "note", title: "A", body: "Same text" });
  const dup = await saveItem({ type: "note", title: "B", body: "Same text" });
  assert.equal(dup.duplicate, true);
});

test("saveItem prepends newest items", async () => {
  await saveItem({ type: "note", title: "First", body: "one" });
  await saveItem({ type: "note", title: "Second", body: "two" });
  const items = await getAllItems();
  assert.equal(items[0].body, "two");
});
