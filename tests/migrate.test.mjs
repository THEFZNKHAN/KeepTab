import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { migrateLegacyStrings } from "../dist-test/migrate.js";
import { getAllItems, clearAll } from "../dist-test/storage.js";

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

test("migrateLegacyStrings imports URLs as links and text as notes", async () => {
  const imported = await migrateLegacyStrings([
    "https://example.com/page",
    "Remember to reply",
    "",
  ]);

  assert.equal(imported, 2);
  const items = await getAllItems();
  assert.equal(items.length, 2);

  const link = items.find((i) => i.type === "link");
  const note = items.find((i) => i.type === "note");

  assert.equal(link?.url, "https://example.com/page");
  assert.equal(note?.body, "Remember to reply");
});
