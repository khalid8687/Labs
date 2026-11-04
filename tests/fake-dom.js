"use strict";

/**
 * A deliberately tiny DOM stand-in, just big enough to exercise the todo app's
 * rendering without pulling in a browser or a dependency. Only the APIs the app
 * actually uses are implemented.
 */

function matches(element, selector) {
  if (!selector) {
    return false;
  }
  if (selector.charAt(0) === ".") {
    return element.classList.contains(selector.slice(1));
  }
  if (selector.charAt(0) === "#") {
    return element.getAttribute("id") === selector.slice(1);
  }
  if (selector.charAt(0) === "[") {
    const parsed = /^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector);
    if (!parsed) {
      return false;
    }
    const value = element.getAttribute(parsed[1]);
    return parsed[2] === undefined ? value !== null : value === parsed[2];
  }
  return element.tagName === selector.toUpperCase();
}

function createElement(tagName) {
  const classes = new Set();
  const children = [];
  const listeners = Object.create(null);
  const attributes = Object.create(null);

  const element = {
    tagName: String(tagName || "div").toUpperCase(),
    parentNode: null,
    childNodes: children,
    dataset: {},
    style: {},
    ownText: "",
    value: "",
    checked: false,
    disabled: false,
    hidden: false,
    maxLength: 0,
    type: "",
    title: "",
  };

  element.classList = {
    add(name) {
      classes.add(name);
    },
    remove(name) {
      classes.delete(name);
    },
    contains(name) {
      return classes.has(name);
    },
    toggle(name, force) {
      const on = force === undefined ? !classes.has(name) : Boolean(force);
      if (on) {
        classes.add(name);
      } else {
        classes.delete(name);
      }
      return on;
    },
  };

  Object.defineProperty(element, "className", {
    get() {
      return Array.from(classes).join(" ");
    },
    set(value) {
      classes.clear();
      String(value || "")
        .split(/\s+/)
        .filter(Boolean)
        .forEach((name) => classes.add(name));
    },
  });

  Object.defineProperty(element, "children", {
    get() {
      return children.slice();
    },
  });

  Object.defineProperty(element, "textContent", {
    get() {
      return element.ownText + children.map((child) => child.textContent).join("");
    },
    set(value) {
      children.length = 0;
      element.ownText = String(value == null ? "" : value);
    },
  });

  element.appendChild = function (child) {
    child.parentNode = element;
    children.push(child);
    return child;
  };

  element.replaceChildren = function () {
    const next = Array.prototype.slice.call(arguments);
    children.length = 0;
    next.forEach((child) => element.appendChild(child));
  };

  element.setAttribute = function (name, value) {
    attributes[name] = String(value);
    if (name === "class") {
      element.className = value;
    }
  };

  element.getAttribute = function (name) {
    return Object.prototype.hasOwnProperty.call(attributes, name) ? attributes[name] : null;
  };

  element.addEventListener = function (type, handler) {
    (listeners[type] = listeners[type] || []).push(handler);
  };

  /** Not a real DOM API: dispatches `type` to the handlers registered above. */
  element.fire = function (type, event) {
    const detail = event || {};
    if (!detail.target) {
      detail.target = element;
    }
    if (typeof detail.preventDefault !== "function") {
      detail.preventDefault = function () {};
    }
    (listeners[type] || []).forEach((handler) => handler(detail));
    return detail;
  };

  element.closest = function (selector) {
    let node = element;
    while (node) {
      if (matches(node, selector)) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  };

  element.querySelectorAll = function (selector) {
    const found = [];
    const walk = (node) => {
      node.children.forEach((child) => {
        if (matches(child, selector)) {
          found.push(child);
        }
        walk(child);
      });
    };
    walk(element);
    return found;
  };

  element.querySelector = function (selector) {
    return element.querySelectorAll(selector)[0] || null;
  };

  element.focus = function () {
    return element;
  };

  element.select = function () {
    return element;
  };

  return element;
}

/**
 * Builds a `document` stub from elements and selector mappings, mirroring how
 * the app looks them up.
 */
function createDocument(options) {
  const settings = options || {};
  const byId = settings.byId || {};
  const selectors = settings.selectors || {};
  const listeners = Object.create(null);

  const document = {
    readyState: settings.readyState || "complete",
    getElementById(id) {
      return byId[id] || null;
    },
    querySelector(selector) {
      return document.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll(selector) {
      return (selectors[selector] || []).slice();
    },
    createElement,
    addEventListener(type, handler) {
      (listeners[type] = listeners[type] || []).push(handler);
    },
    fire(type, event) {
      (listeners[type] || []).forEach((handler) => handler(event || {}));
    },
  };

  return document;
}

module.exports = { createElement, createDocument };
