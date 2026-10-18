"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { Calculator, formatNumber } = require("../script.js");

function pressAll(calc, keys) {
  keys.split(" ").forEach((key) => {
    if (/^[0-9]$/.test(key)) {
      calc.press("digit", key);
    } else if ("+-*/".includes(key)) {
      calc.press("operator", key);
    } else if (key === "=") {
      calc.press("equals");
    } else if (key === ".") {
      calc.press("decimal");
    } else if (key === "C") {
      calc.press("clear");
    } else if (key === "D") {
      calc.press("delete");
    } else if (key === "S") {
      calc.press("sign");
    } else if (key === "%") {
      calc.press("percent");
    } else {
      throw new Error("Unknown test key: " + key);
    }
  });
  return calc.display();
}

test("adds two numbers", () => {
  const calc = new Calculator();
  assert.equal(pressAll(calc, "1 2 + 7 ="), "19");
  assert.equal(calc.historyText(), "12 + 7 =");
});

test("subtracts, multiplies and divides", () => {
  assert.equal(pressAll(new Calculator(), "9 - 4 ="), "5");
  assert.equal(pressAll(new Calculator(), "6 * 7 ="), "42");
  assert.equal(pressAll(new Calculator(), "8 / 2 ="), "4");
});

test("chains immediate operations", () => {
  assert.equal(pressAll(new Calculator(), "2 + 3 * 4 ="), "20");
  assert.equal(pressAll(new Calculator(), "1 0 + 5 + 5 ="), "20");
});

test("replaces operator when pressed twice", () => {
  assert.equal(pressAll(new Calculator(), "8 + * 2 ="), "16");
});

test("supports decimal input", () => {
  const calc = new Calculator();
  assert.equal(pressAll(calc, "0 . 1 + 0 . 2 ="), "0.3");
});

test("keeps typing after equals starts a new number", () => {
  const calc = new Calculator();
  assert.equal(pressAll(calc, "2 + 2 ="), "4");
  assert.equal(pressAll(calc, "9"), "9");
});

test("repeats last operation on consecutive equals", () => {
  const calc = new Calculator();
  assert.equal(pressAll(calc, "5 + 3 ="), "8");
  assert.equal(pressAll(calc, "="), "11");
});

test("continues calculating from the result", () => {
  assert.equal(pressAll(new Calculator(), "2 + 3 = + 5 ="), "10");
});

test("handles divide by zero as an error and recovers", () => {
  const calc = new Calculator();
  assert.equal(pressAll(calc, "5 / 0 ="), "Cannot divide by zero");
  assert.equal(calc.isError(), true);
  assert.equal(pressAll(calc, "7"), "7");
  assert.equal(calc.isError(), false);
});

test("toggles sign, percent and deletes digits", () => {
  assert.equal(pressAll(new Calculator(), "5 S"), "-5");
  assert.equal(pressAll(new Calculator(), "5 0 %"), "0.5");
  assert.equal(pressAll(new Calculator(), "1 2 3 D"), "12");
});

test("clears the display and history", () => {
  const calc = new Calculator();
  pressAll(calc, "1 2 + 3 =");
  calc.press("clear");
  assert.equal(calc.display(), "0");
  assert.equal(calc.historyText(), "");
});

test("limits input length", () => {
  const calc = new Calculator();
  pressAll(calc, "1 2 3 4 5 6 7 8 9 0 1 2 3 4 5");
  assert.equal(calc.display(), "123456789012");
});

test("formats numbers without floating point noise", () => {
  assert.equal(formatNumber(0.1 + 0.2), "0.3");
  assert.equal(formatNumber(1 / 3), "0.333333333333");
  assert.equal(formatNumber(-0), "0");
  assert.equal(formatNumber(NaN), "Error");
  assert.equal(formatNumber(1e13), "1e+13");
});
