"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { TodoStore, FILTERS, STORAGE_KEY } = require("../todo/script.js");

function createMemoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    has: (key) => data.has(key),
  };
}

const titles = (store) => store.items.map((item) => item.title);
const visibleTitles = (store) => store.visible().map((item) => item.title);

test("adds trimmed tasks and ignores blank input", () => {
  const store = new TodoStore();
  assert.equal(store.add("  Buy milk  ").title, "Buy milk");
  assert.equal(store.items.length, 1);
  assert.equal(store.add("   "), null);
  assert.equal(store.add(""), null);
  assert.equal(store.add(undefined), null);
  assert.equal(store.items.length, 1);
});

test("collapses inner whitespace so titles stay tidy", () => {
  const store = new TodoStore();
  assert.equal(store.add("call   the \n bank").title, "call the bank");
});

test("gives every task a unique id", () => {
  const store = new TodoStore();
  const ids = [store.add("a"), store.add("b"), store.add("c")].map((item) => item.id);
  assert.equal(new Set(ids).size, 3);
});

test("toggles a task and reports unknown ids", () => {
  const store = new TodoStore();
  const item = store.add("Walk the dog");
  assert.equal(store.toggle(item.id).completed, true);
  assert.equal(store.toggle(item.id).completed, false);
  assert.equal(store.toggle("missing"), null);
});

test("toggles all tasks at once", () => {
  const store = new TodoStore();
  store.add("a");
  store.add("b");
  store.toggleAll();
  assert.equal(store.remaining(), 0);
  assert.equal(store.completedCount(), 2);
  store.toggleAll(false);
  assert.equal(store.remaining(), 2);
});

test("removes a task", () => {
  const store = new TodoStore();
  const item = store.add("Mail the invoice");
  assert.equal(store.remove(item.id), true);
  assert.equal(store.remove(item.id), false);
  assert.equal(store.items.length, 0);
});

test("renames a task and deletes it when the title is cleared", () => {
  const store = new TodoStore();
  const item = store.add("Old title");
  assert.equal(store.update(item.id, "  New title ").title, "New title");
  assert.equal(titles(store).join(), "New title");

  assert.equal(store.update(item.id, "   "), null);
  assert.equal(store.items.length, 0);
  assert.equal(store.update("missing", "anything"), null);
});

test("clears completed tasks and reports how many went", () => {
  const store = new TodoStore();
  const done = store.add("done thing");
  store.add("pending thing");
  store.toggle(done.id);
  assert.equal(store.clearCompleted(), 1);
  assert.deepEqual(titles(store), ["pending thing"]);
  assert.equal(store.clearCompleted(), 0);
});

test("filters tasks by all, active and completed", () => {
  const store = new TodoStore();
  const first = store.add("first");
  store.add("second");
  store.toggle(first.id);

  assert.deepEqual(visibleTitles(store), ["first", "second"]);

  store.setFilter("active");
  assert.equal(store.filter, "active");
  assert.deepEqual(visibleTitles(store), ["second"]);

  store.setFilter("completed");
  assert.deepEqual(visibleTitles(store), ["first"]);

  store.setFilter("nonsense");
  assert.equal(store.filter, "completed", "invalid filters are ignored");
});

test("counts remaining and completed tasks", () => {
  const store = new TodoStore();
  const first = store.add("first");
  store.add("second");
  store.toggle(first.id);
  assert.equal(store.remaining(), 1);
  assert.equal(store.completedCount(), 1);
});

test("persists tasks to storage and reloads them", () => {
  const storage = createMemoryStorage();
  const first = new TodoStore({ storage });
  const item = first.add("Remember the milk");
  first.toggle(item.id);
  assert.ok(storage.has(STORAGE_KEY));

  const reloaded = new TodoStore({ storage });
  assert.equal(reloaded.items.length, 1);
  assert.equal(reloaded.items[0].title, "Remember the milk");
  assert.equal(reloaded.items[0].completed, true);
  assert.equal(reloaded.items[0].id, item.id, "ids survive a reload");
});

test("keeps minting unique ids after loading stored tasks", () => {
  const storage = createMemoryStorage();
  const seeded = new TodoStore({ storage });
  const stored = seeded.add("stored task");
  storage.setItem(STORAGE_KEY, JSON.stringify({ items: [stored] }));

  const reloaded = new TodoStore({ storage });
  const fresh = reloaded.add("fresh task");
  assert.notEqual(fresh.id, stored.id);
});

test("ignores corrupt or unusable storage content", () => {
  const storage = createMemoryStorage();
  storage.setItem(STORAGE_KEY, "{not json");
  assert.equal(new TodoStore({ storage }).items.length, 0);

  storage.setItem(STORAGE_KEY, JSON.stringify({ items: [{ title: "   " }, { completed: true }, null] }));
  const store = new TodoStore({ storage });
  assert.equal(store.items.length, 0, "invalid entries are dropped");
});

test("works without storage and survives storage errors", () => {
  assert.equal(new TodoStore().add("no storage").title, "no storage");

  const broken = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  const store = new TodoStore({ storage: broken });
  assert.equal(store.add("still works").title, "still works");
  assert.equal(store.items.length, 1);
});

test("exposes the supported filters", () => {
  assert.deepEqual(FILTERS, ["all", "active", "completed"]);
});
