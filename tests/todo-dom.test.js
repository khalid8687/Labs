"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createElement, createDocument } = require("./fake-dom.js");

const html = fs.readFileSync(path.join(__dirname, "..", "todo", "index.html"), "utf8");

// Build the elements the script looks up, mirroring todo/index.html.
const form = createElement("form");
const input = createElement("input");
const list = createElement("ul");
const emptyState = createElement("p");
const countLabel = createElement("span");
const clearButton = createElement("button");
const filterButtons = ["all", "active", "completed"].map((filter) => {
  const button = createElement("button");
  button.className = "filter";
  button.dataset.filter = filter;
  return button;
});

global.document = createDocument({
  byId: {
    "todo-form": form,
    "new-todo": input,
    "todo-list": list,
    "empty-state": emptyState,
    "items-left": countLabel,
    "clear-completed": clearButton,
  },
  selectors: { ".filter": filterButtons },
});

require("../todo/script.js");

function rowText(row) {
  const span = row.children.find((child) => child.classList.contains("todo__text"));
  assert.ok(span, "row is missing its text element");
  return span.textContent;
}

function rowTitles() {
  return list.children.map(rowText);
}

function addTask(title) {
  input.value = title;
  form.fire("submit");
}

function rowByTitle(title) {
  return list.children.find((row) => rowText(row) === title) || null;
}

function pressFilter(filter) {
  filterButtons.find((button) => button.dataset.filter === filter).fire("click");
}

test("todo/index.html provides the elements and filters the script expects", () => {
  ["todo-form", "new-todo", "todo-list", "empty-state", "items-left", "clear-completed"].forEach(
    (id) => assert.ok(html.includes(`id="${id}"`), `missing #${id}`)
  );
  ["all", "active", "completed"].forEach((filter) =>
    assert.ok(html.includes(`data-filter="${filter}"`), `missing filter ${filter}`)
  );
  assert.ok(html.includes('class="filter"'), "filters need the .filter class");
});

test("starts empty with the empty state visible", () => {
  assert.equal(list.children.length, 0);
  assert.equal(emptyState.hidden, false);
  assert.equal(countLabel.textContent, "0 items left");
  assert.equal(clearButton.disabled, true);
});

test("submitting the form adds a task and clears the input", () => {
  addTask("Buy milk");
  assert.deepEqual(rowTitles(), ["Buy milk"]);
  assert.equal(input.value, "");
  assert.equal(emptyState.hidden, true);
  assert.equal(countLabel.textContent, "1 item left", "singular wording for one task");
});

test("blank submissions are ignored", () => {
  const before = list.children.length;
  addTask("   ");
  assert.equal(list.children.length, before);
});

test("checking a task marks it done and updates the counter", () => {
  addTask("Walk the dog");
  const row = rowByTitle("Walk the dog");
  const checkbox = row.children.find((child) => child.classList.contains("todo__toggle")).children[0];

  checkbox.fire("change");
  assert.equal(rowByTitle("Walk the dog").classList.contains("todo--done"), true);
  assert.equal(countLabel.textContent, "1 item left");
  assert.equal(clearButton.disabled, false);

  checkbox.fire("change");
  assert.equal(rowByTitle("Walk the dog").classList.contains("todo--done"), false);
  assert.equal(countLabel.textContent, "2 items left");

  // Leave it completed so the filter tests below have one of each.
  checkbox.fire("change");
  assert.equal(countLabel.textContent, "1 item left");
});

test("filters show only the matching tasks and set aria-pressed", () => {
  pressFilter("active");
  assert.deepEqual(rowTitles(), ["Buy milk"]);
  assert.equal(filterButtons[1].getAttribute("aria-pressed"), "true");
  assert.equal(filterButtons[0].getAttribute("aria-pressed"), "false");

  pressFilter("completed");
  assert.deepEqual(rowTitles(), ["Walk the dog"]);
  assert.equal(emptyState.textContent, "No completed tasks yet.");

  pressFilter("all");
  assert.deepEqual(rowTitles(), ["Buy milk", "Walk the dog"]);
});

test("double-clicking a task renames it with Enter", () => {
  const row = rowByTitle("Buy milk");
  const text = row.children.find((child) => child.classList.contains("todo__text"));
  text.fire("dblclick");

  const editor = list.children[0].children.find((child) => child.classList.contains("todo__edit"));
  assert.ok(editor, "editor input should be rendered");
  assert.equal(editor.value, "Buy milk");

  editor.value = "Buy oat milk";
  editor.fire("keydown", { key: "Enter" });
  assert.deepEqual(rowTitles(), ["Buy oat milk", "Walk the dog"]);
});

test("Escape abandons an edit", () => {
  const row = rowByTitle("Buy oat milk");
  const text = row.children.find((child) => child.classList.contains("todo__text"));
  text.fire("dblclick");

  const editor = list.children[0].children.find((child) => child.classList.contains("todo__edit"));
  editor.value = "throw this away";
  editor.fire("keydown", { key: "Escape" });
  assert.deepEqual(rowTitles(), ["Buy oat milk", "Walk the dog"]);
});

test("clearing an edited title deletes the task", () => {
  const row = rowByTitle("Buy oat milk");
  const text = row.children.find((child) => child.classList.contains("todo__text"));
  text.fire("dblclick");

  const editor = list.children[0].children.find((child) => child.classList.contains("todo__edit"));
  editor.value = "  ";
  editor.fire("keydown", { key: "Enter" });
  assert.deepEqual(rowTitles(), ["Walk the dog"]);
});

test("the delete button removes a task", () => {
  addTask("Temporary task");
  const row = rowByTitle("Temporary task");
  const destroy = row.children.find((child) => child.classList.contains("todo__destroy"));
  destroy.fire("click");
  assert.deepEqual(rowTitles().includes("Temporary task"), false);
});

test("clear completed removes finished tasks and disables itself", () => {
  pressFilter("all");
  assert.deepEqual(rowTitles(), ["Walk the dog"]);

  clearButton.fire("click");
  assert.deepEqual(rowTitles(), []);
  assert.equal(clearButton.disabled, true);
  assert.equal(countLabel.textContent, "0 items left");
  assert.equal(emptyState.hidden, false, "empty state returns once the list is empty");
});
