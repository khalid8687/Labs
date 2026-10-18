/**
 * Calculator logic, DOM rendering and keyboard support.
 * The pure logic lives in the Calculator class so it can be tested in isolation.
 */
(function (global) {
  "use strict";

  var MAX_INPUT_LENGTH = 12;
  var OPERATOR_SYMBOLS = { "+": "+", "-": "\u2212", "*": "\u00d7", "/": "\u00f7" };

  function formatNumber(value) {
    if (!Number.isFinite(value)) {
      return "Error";
    }
    if (Object.is(value, -0)) {
      value = 0;
    }
    if (Math.abs(value) >= 1e12) {
      return value
        .toExponential(6)
        .replace(/(\.\d*?)0+e/, "$1e")
        .replace(/\.e/, "e");
    }
    // Trim floating point noise (0.1 + 0.2 -> 0.3) without losing real precision.
    var rounded = parseFloat(value.toPrecision(12));
    return String(rounded);
  }

  function Calculator() {
    this.reset();
  }

  Calculator.prototype.reset = function () {
    this.current = "0";
    this.previous = null;
    this.operator = null;
    this.waitingForOperand = false;
    this.error = false;
    this.history = "";
    this.lastOperator = null;
    this.lastOperand = null;
  };

  Calculator.prototype.isError = function () {
    return this.error;
  };

  Calculator.prototype.display = function () {
    return this.current;
  };

  Calculator.prototype.historyText = function () {
    return this.history;
  };

  Calculator.prototype.selectedOperator = function () {
    return this.waitingForOperand ? this.operator : null;
  };

  Calculator.prototype._fail = function () {
    this.error = true;
    this.current = "Cannot divide by zero";
    this.previous = null;
    this.operator = null;
    this.waitingForOperand = true;
    this.history = "";
  };

  Calculator.prototype._calculate = function (left, right, operator) {
    switch (operator) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        return right === 0 ? NaN : left / right;
      default:
        return right;
    }
  };

  Calculator.prototype.inputDigit = function (digit) {
    if (this.error) {
      this.reset();
    }
    if (this.waitingForOperand) {
      this.current = digit;
      this.waitingForOperand = false;
      return;
    }
    if (this.current === "0") {
      this.current = digit;
      return;
    }
    if (this.current.replace(/[-.]/g, "").length >= MAX_INPUT_LENGTH) {
      return;
    }
    this.current += digit;
  };

  Calculator.prototype.inputDecimal = function () {
    if (this.error) {
      this.reset();
    }
    if (this.waitingForOperand) {
      this.current = "0.";
      this.waitingForOperand = false;
      return;
    }
    if (this.current.indexOf(".") === -1) {
      this.current += ".";
    }
  };

  Calculator.prototype.chooseOperator = function (operator) {
    if (this.error) {
      return;
    }
    var value = parseFloat(this.current);

    if (this.operator !== null && !this.waitingForOperand) {
      var result = this._calculate(this.previous, value, this.operator);
      if (!Number.isFinite(result)) {
        this._fail();
        return;
      }
      this.previous = result;
      this.current = formatNumber(result);
    } else if (this.operator === null) {
      this.previous = value;
    }

    this.operator = operator;
    this.waitingForOperand = true;
    this.history = formatNumber(this.previous) + " " + OPERATOR_SYMBOLS[operator];
  };

  Calculator.prototype.equals = function () {
    if (this.error) {
      return;
    }

    var left;
    var right;
    var operator;

    if (this.operator !== null) {
      left = this.previous;
      right = parseFloat(this.current);
      operator = this.operator;
      this.lastOperator = operator;
      this.lastOperand = right;
    } else if (this.lastOperator !== null) {
      // Pressing "=" again repeats the last operation.
      left = parseFloat(this.current);
      right = this.lastOperand;
      operator = this.lastOperator;
      this.previous = left;
    } else {
      return;
    }

    var result = this._calculate(left, right, operator);
    if (!Number.isFinite(result)) {
      this._fail();
      return;
    }

    this.history =
      formatNumber(left) +
      " " +
      OPERATOR_SYMBOLS[operator] +
      " " +
      formatNumber(right) +
      " =";
    this.current = formatNumber(result);
    this.previous = null;
    this.operator = null;
    this.waitingForOperand = true;
    // Keep the result as the operand for a follow-up calculation.
    this.lastResult = parseFloat(this.current);
  };

  Calculator.prototype.clear = function () {
    this.reset();
  };

  Calculator.prototype.deleteLast = function () {
    if (this.error) {
      this.reset();
      return;
    }
    if (this.waitingForOperand) {
      return;
    }
    this.current = this.current.slice(0, -1);
    if (this.current === "" || this.current === "-") {
      this.current = "0";
    }
  };

  Calculator.prototype.toggleSign = function () {
    if (this.error || this.current === "0") {
      return;
    }
    this.current =
      this.current.charAt(0) === "-" ? this.current.slice(1) : "-" + this.current;
  };

  Calculator.prototype.percent = function () {
    if (this.error) {
      return;
    }
    this.current = formatNumber(parseFloat(this.current) / 100);
    this.waitingForOperand = false;
  };

  Calculator.prototype.press = function (action, value) {
    switch (action) {
      case "digit":
        this.inputDigit(value);
        break;
      case "decimal":
        this.inputDecimal();
        break;
      case "operator":
        this.chooseOperator(value);
        break;
      case "equals":
        this.equals();
        break;
      case "clear":
        this.clear();
        break;
      case "delete":
        this.deleteLast();
        break;
      case "sign":
        this.toggleSign();
        break;
      case "percent":
        this.percent();
        break;
      default:
        break;
    }
  };

  function init() {
    var display = document.getElementById("display");
    var history = document.getElementById("history");
    var keys = document.querySelector(".keys");
    var calculator = new Calculator();
    var operatorKeys = Array.prototype.slice.call(
      document.querySelectorAll(".key--operator")
    );

    function render() {
      display.textContent = calculator.display();
      display.classList.toggle("is-error", calculator.isError());
      history.textContent = calculator.historyText();
      var selected = calculator.selectedOperator();
      operatorKeys.forEach(function (key) {
        key.classList.toggle("is-selected", key.dataset.operator === selected);
      });
    }

    function handleAction(action, value) {
      calculator.press(action, value);
      render();
    }

    keys.addEventListener("click", function (event) {
      var button = event.target.closest("button.key");
      if (!button) {
        return;
      }
      if (button.dataset.digit !== undefined) {
        handleAction("digit", button.dataset.digit);
      } else if (button.dataset.operator !== undefined) {
        handleAction("operator", button.dataset.operator);
      } else if (button.dataset.action !== undefined) {
        handleAction(button.dataset.action);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      var key = event.key;
      var action = null;
      var value;

      if (/^[0-9]$/.test(key)) {
        action = "digit";
        value = key;
      } else if (key === "." || key === ",") {
        action = "decimal";
      } else if (key === "+" || key === "-" || key === "*" || key === "/") {
        action = "operator";
        value = key;
      } else if (key === "Enter" || key === "=") {
        action = "equals";
      } else if (key === "Backspace") {
        action = "delete";
      } else if (key === "Escape" || key === "Delete") {
        action = "clear";
      } else if (key === "%") {
        action = "percent";
      }

      if (action) {
        event.preventDefault();
        handleAction(action, value);
      }
    });

    render();
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { Calculator: Calculator, formatNumber: formatNumber };
  }

  global.Calculator = Calculator;
})(typeof window !== "undefined" ? window : globalThis);
