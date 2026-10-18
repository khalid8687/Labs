"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function createClassList() {
  const names = new Set();
  return {
    toggle(name, force) {
      if (force) {
        names.add(name);
      } else {
        names.delete(name);
      }
    },
    contains(name) {
      return names.has(name);
    },
  };
}

// Minimal DOM stub: parse the real buttons from index.html so the wiring is tested.
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const buttons = Array.from(html.matchAll(/<button\b([^>]*)>/g), (match) => {
  const dataset = {};
  for (const attr of match[1].matchAll(/data-([a-z]+)="([^"]*)"/g)) {
    dataset[attr[1]] = attr[2];
  }
  const element = { dataset, classList: createClassList() };
  element.closest = () => element;
  return element;
});

const display = { textContent: "0", classList: createClassList() };
const history = { textContent: "", classList: createClassList() };
let clickHandler = null;
let keyHandler = null;

const keysElement = {
  addEventListener(type, handler) {
    if (type === "click") {
      clickHandler = handler;
    }
  },
};

global.document = {
  readyState: "complete",
  getElementById(id) {
    return id === "display" ? display : history;
  },
  querySelector(selector) {
    return selector === ".keys" ? keysElement : null;
  },
  querySelectorAll(selector) {
    return selector === ".key--operator"
      ? buttons.filter((button) => button.dataset.operator !== undefined)
      : [];
  },
  addEventListener(type, handler) {
    if (type === "keydown") {
      keyHandler = handler;
    }
  },
};

require("../script.js");

function clickButton(predicate) {
  const button = buttons.find(predicate);
  assert.ok(button, "button not found in index.html");
  clickHandler({ target: button });
}

const pressDigit = (digit) =>
  clickButton((button) => button.dataset.digit === String(digit));
const pressOperator = (operator) =>
  clickButton((button) => button.dataset.operator === operator);
const pressAction = (action) =>
  clickButton((button) => button.dataset.action === action);

function pressKey(key) {
  const event = {
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    prevented: false,
    preventDefault() {
      this.prevented = true;
    },
  };
  keyHandler(event);
  return event;
}

test("index.html provides every control the script listens for", () => {
  ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].forEach((digit) =>
    assert.ok(buttons.some((button) => button.dataset.digit === digit), digit)
  );
  ["+", "-", "*", "/"].forEach((operator) =>
    assert.ok(
      buttons.some((button) => button.dataset.operator === operator),
      operator
    )
  );
  ["clear", "delete", "sign", "percent", "decimal", "equals"].forEach((action) =>
    assert.ok(
      buttons.some((button) => button.dataset.action === action),
      action
    )
  );
});

test("clicking buttons updates the display and history", () => {
  pressDigit(1);
  pressDigit(2);
  pressOperator("+");
  pressDigit(7);
  pressAction("equals");
  assert.equal(display.textContent, "19");
  assert.equal(history.textContent, "12 + 7 =");
});

test("AC clears display, history and selection", () => {
  pressAction("clear");
  assert.equal(display.textContent, "0");
  assert.equal(history.textContent, "");
  assert.equal(
    buttons.some(
      (button) =>
        button.dataset.operator !== undefined &&
        button.classList.contains("is-selected")
    ),
    false
  );
});

test("selected operator is highlighted", () => {
  pressDigit(8);
  pressOperator("/");
  const selected = buttons.filter(
    (button) =>
      button.dataset.operator !== undefined &&
      button.classList.contains("is-selected")
  );
  assert.equal(selected.length, 1);
  assert.equal(selected[0].dataset.operator, "/");
  assert.equal(history.textContent, "8 \u00f7");
});

test("keyboard input works and prevents default for handled keys", () => {
  pressAction("clear");
  const event = pressKey("6");
  pressKey("*");
  pressKey("7");
  pressKey("Enter");
  assert.equal(display.textContent, "42");
  assert.equal(event.prevented, true);
});

test("divide by zero shows an error and Escape recovers", () => {
  pressAction("clear");
  pressDigit(9);
  pressOperator("/");
  pressDigit(0);
  pressAction("equals");
  assert.equal(display.textContent, "Cannot divide by zero");
  assert.equal(display.classList.contains("is-error"), true);

  pressKey("Escape");
  assert.equal(display.textContent, "0");
  assert.equal(display.classList.contains("is-error"), false);
});
