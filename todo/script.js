/**
 * Todo app logic, DOM rendering and keyboard support.
 * The pure logic lives in the TodoStore class so it can be tested in isolation.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "todo-app:v1";
  var FILTERS = ["all", "active", "completed"];

  function isFilter(value) {
    return FILTERS.indexOf(value) !== -1;
  }

  function normaliseTitle(title) {
    return typeof title === "string" ? title.trim().replace(/\s+/g, " ") : "";
  }

  /**
   * Pure todo state: items, the active filter and (optional) localStorage
   * persistence. It never touches the DOM, which keeps it easy to test.
   *
   * @param {{storage?: Storage|null, storageKey?: string, items?: Array}} [options]
   */
  function TodoStore(options) {
    options = options || {};
    this.storage = options.storage || null;
    this.storageKey = options.storageKey || STORAGE_KEY;
    this.filter = "all";
    this.items = [];
    this.nextId = 1;

    if (Array.isArray(options.items)) {
      this._adopt(options.items);
    } else {
      this.load();
    }
  }

  TodoStore.prototype._makeId = function () {
    var id;
    do {
      id = "todo-" + this.nextId++;
    } while (this.items.some(function (item) { return item.id === id; }));
    return id;
  };

  TodoStore.prototype._adopt = function (items) {
    var self = this;
    this.items = items
      .filter(function (item) {
        return item && typeof item.title === "string" && normaliseTitle(item.title) !== "";
      })
      .map(function (item) {
        var id = typeof item.id === "string" && item.id ? item.id : self._makeId();
        return {
          id: id,
          title: normaliseTitle(item.title),
          completed: item.completed === true,
        };
      });
    // Keep the counter clear of ids that came from storage.
    this.items.forEach(function (item) {
      var match = /^todo-(\d+)$/.exec(item.id);
      if (match) {
        self.nextId = Math.max(self.nextId, Number(match[1]) + 1);
      }
    });
  };

  TodoStore.prototype.load = function () {
    if (!this.storage) {
      return;
    }
    try {
      var raw = this.storage.getItem(this.storageKey);
      if (!raw) {
        return;
      }
      var parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items)) {
        this._adopt(parsed.items);
      }
    } catch (error) {
      // Corrupt or unavailable storage should never break the app.
      this.items = [];
    }
  };

  TodoStore.prototype.save = function () {
    if (!this.storage) {
      return;
    }
    try {
      this.storage.setItem(this.storageKey, JSON.stringify({ items: this.items }));
    } catch (error) {
      // Quota exceeded or blocked storage: keep working in memory.
    }
  };

  /** Adds a task and returns it, or returns null when the title is blank. */
  TodoStore.prototype.add = function (title) {
    var clean = normaliseTitle(title);
    if (!clean) {
      return null;
    }
    var item = { id: this._makeId(), title: clean, completed: false };
    this.items.push(item);
    this.save();
    return item;
  };

  TodoStore.prototype.find = function (id) {
    for (var i = 0; i < this.items.length; i += 1) {
      if (this.items[i].id === id) {
        return this.items[i];
      }
    }
    return null;
  };

  /** Flips a task. Returns the updated task or null when the id is unknown. */
  TodoStore.prototype.toggle = function (id) {
    var item = this.find(id);
    if (!item) {
      return null;
    }
    item.completed = !item.completed;
    this.save();
    return item;
  };

  /** Toggles every task to `completed` (defaults to true). */
  TodoStore.prototype.toggleAll = function (completed) {
    var done = completed === undefined ? true : completed;
    this.items.forEach(function (item) {
      item.completed = done;
    });
    this.save();
  };

  /** Removes a task. Returns true when something was removed. */
  TodoStore.prototype.remove = function (id) {
    var before = this.items.length;
    this.items = this.items.filter(function (item) { return item.id !== id; });
    var removed = this.items.length !== before;
    if (removed) {
      this.save();
    }
    return removed;
  };

  /**
   * Renames a task. A blank title deletes the task (matching the usual todo
   * UX where clearing the text discards the item).
   */
  TodoStore.prototype.update = function (id, title) {
    var item = this.find(id);
    if (!item) {
      return null;
    }
    var clean = normaliseTitle(title);
    if (!clean) {
      this.remove(id);
      return null;
    }
    item.title = clean;
    this.save();
    return item;
  };

  /** Removes every completed task and returns how many were dropped. */
  TodoStore.prototype.clearCompleted = function () {
    var before = this.items.length;
    this.items = this.items.filter(function (item) { return !item.completed; });
    var removed = before - this.items.length;
    if (removed > 0) {
      this.save();
    }
    return removed;
  };

  TodoStore.prototype.setFilter = function (filter) {
    if (isFilter(filter)) {
      this.filter = filter;
    }
    return this.filter;
  };

  /** Items matching the active filter. */
  TodoStore.prototype.visible = function () {
    var filter = this.filter;
    return this.items.filter(function (item) {
      if (filter === "active") {
        return !item.completed;
      }
      if (filter === "completed") {
        return item.completed;
      }
      return true;
    });
  };

  TodoStore.prototype.remaining = function () {
    return this.items.filter(function (item) { return !item.completed; }).length;
  };

  TodoStore.prototype.completedCount = function () {
    return this.items.length - this.remaining();
  };

  /** localStorage can throw (private mode, quota); fall back to memory only. */
  function safeStorage() {
    try {
      var storage = global.localStorage;
      if (!storage) {
        return null;
      }
      var probe = "todo-app:probe";
      storage.setItem(probe, "1");
      storage.removeItem(probe);
      return storage;
    } catch (error) {
      return null;
    }
  }

  function init() {
    var doc = document;
    var form = doc.getElementById("todo-form");
    var input = doc.getElementById("new-todo");
    var list = doc.getElementById("todo-list");
    var emptyState = doc.getElementById("empty-state");
    var countLabel = doc.getElementById("items-left");
    var clearButton = doc.getElementById("clear-completed");
    var filterButtons = Array.prototype.slice.call(doc.querySelectorAll(".filter"));

    if (!form || !input || !list) {
      return;
    }

    var store = new TodoStore({ storage: safeStorage() });
    var editingId = null;

    function emptyMessage() {
      if (store.items.length === 0) {
        return "Nothing here yet. Add your first task above.";
      }
      if (store.filter === "active") {
        return "No active tasks. Nice work!";
      }
      if (store.filter === "completed") {
        return "No completed tasks yet.";
      }
      return "Nothing to show.";
    }

    function renderEditor(todo) {
      var field = doc.createElement("input");
      field.type = "text";
      field.className = "todo__edit";
      field.maxLength = 200;
      field.value = todo.title;
      field.setAttribute("aria-label", "Rename task");

      var settled = false;
      function commit() {
        if (settled) {
          return;
        }
        settled = true;
        editingId = null;
        store.update(todo.id, field.value);
        render();
      }
      function cancel() {
        if (settled) {
          return;
        }
        settled = true;
        editingId = null;
        render();
      }

      field.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        } else if (event.key === "Escape") {
          event.preventDefault();
          cancel();
        }
      });
      field.addEventListener("blur", commit);

      if (typeof field.focus === "function") {
        field.focus();
      }
      if (typeof field.select === "function") {
        field.select();
      }
      return field;
    }

    function renderItem(todo) {
      var row = doc.createElement("li");
      row.className = "todo" + (todo.completed ? " todo--done" : "");
      row.dataset.id = todo.id;

      if (editingId === todo.id) {
        row.appendChild(renderEditor(todo));
        return row;
      }

      var label = doc.createElement("label");
      label.className = "todo__toggle";

      var checkbox = doc.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = todo.completed;
      checkbox.setAttribute("aria-label", "Mark \"" + todo.title + "\" as done");
      checkbox.addEventListener("change", function () {
        store.toggle(todo.id);
        render();
      });
      label.appendChild(checkbox);

      var text = doc.createElement("span");
      text.className = "todo__text";
      text.textContent = todo.title;
      text.title = "Double-click to rename";
      text.addEventListener("dblclick", function () {
        editingId = todo.id;
        render();
      });

      var destroy = doc.createElement("button");
      destroy.type = "button";
      destroy.className = "todo__destroy";
      destroy.textContent = "\u00d7";
      destroy.setAttribute("aria-label", "Delete \"" + todo.title + "\"");
      destroy.addEventListener("click", function () {
        store.remove(todo.id);
        if (editingId === todo.id) {
          editingId = null;
        }
        render();
      });

      row.appendChild(label);
      row.appendChild(text);
      row.appendChild(destroy);
      return row;
    }

    function render() {
      var visible = store.visible();
      list.replaceChildren();
      visible.forEach(function (todo) {
        list.appendChild(renderItem(todo));
      });

      emptyState.hidden = visible.length > 0;
      emptyState.textContent = emptyMessage();

      var remaining = store.remaining();
      countLabel.textContent = remaining + (remaining === 1 ? " item left" : " items left");

      filterButtons.forEach(function (button) {
        button.setAttribute("aria-pressed", String(button.dataset.filter === store.filter));
      });

      clearButton.disabled = store.completedCount() === 0;
    }

    form.addEventListener("submit", function (event) {
      if (typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      if (store.add(input.value)) {
        input.value = "";
        editingId = null;
        render();
      }
      if (typeof input.focus === "function") {
        input.focus();
      }
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && input.value) {
        input.value = "";
      }
    });

    filterButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        store.setFilter(button.dataset.filter);
        render();
      });
    });

    clearButton.addEventListener("click", function () {
      store.clearCompleted();
      if (editingId && !store.find(editingId)) {
        editingId = null;
      }
      render();
    });

    render();
    if (typeof input.focus === "function") {
      input.focus();
    }
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { TodoStore: TodoStore, FILTERS: FILTERS, STORAGE_KEY: STORAGE_KEY };
  }

  global.TodoStore = TodoStore;
})(typeof window !== "undefined" ? window : globalThis);

