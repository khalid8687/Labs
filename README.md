# Labs

A small collection of experiments built with plain **HTML**, **CSS** and
**JavaScript** — no frameworks, no build step.

| App | Source | Live preview |
| --- | --- | --- |
| Calculator | [`index.html`](./index.html) | <https://rawcdn.githack.com/khalid8687/Labs/gh-pages/index.html> |
| Todo | [`todo/index.html`](./todo/index.html) | <https://rawcdn.githack.com/khalid8687/Labs/gh-pages/todo/index.html> |

The live previews above are served from the **`gh-pages`** branch by the
raw.githack CDN. On the first visit raw.githack shows a one-time
*External Content Notice* — click **Open the page** and the app loads.

To publish with GitHub Pages instead, push to `gh-pages` and enable
*Settings → Pages → Deploy from a branch → `gh-pages` → `/ (root)`*; the apps
then appear at **https://khalid8687.github.io/Labs/** (calculator) and
**https://khalid8687.github.io/Labs/todo/** (todo). This needs repository admin
rights, so it is the one step that has to be done in the GitHub UI.

## Calculator

[`index.html`](./index.html) · [`style.css`](./style.css) · [`script.js`](./script.js)

### Features

- Basic arithmetic: `+`, `−`, `×`, `÷` with immediate-execution chaining
- `AC` (clear), `DEL` (backspace), `±` (sign toggle), `%` (percent)
- Chained calculations and repeating the last operation with `=`
- Floating point noise cleanup (`0.1 + 0.2` shows `0.3`)
- Divide-by-zero is reported as `Cannot divide by zero` and recovers on the next key
- Keyboard support: digits, `.`, `+ - * /`, `Enter`/`=`, `Backspace`, `Esc`
- Responsive layout with a reduced-motion media query

## Todo

[`todo/index.html`](./todo/index.html) · [`todo/style.css`](./todo/style.css) · [`todo/script.js`](./todo/script.js)

### Features

- Add tasks with the form (`Enter` or the **Add** button); blank input is ignored
- Tick a checkbox to complete a task, or delete it with the `×` button
- Double-click a task to rename it: `Enter` saves, `Esc` cancels, an empty title deletes it
- Filters for **All / Active / Completed**, plus a live *n items left* counter
- **Clear completed** removes finished tasks and disables itself when there are none
- Tasks persist in `localStorage` (with a probe so private mode or full quota
  degrade to in-memory state instead of crashing)
- Accessible markup: labelled controls, `aria-pressed` filters, `aria-live` counter
- Responsive layout with a reduced-motion media query

## Run it

Open either `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000        (calculator)
#      and  http://localhost:8000/todo/   (todo app)
```

## Tests

Logic is isolated in small classes (`Calculator`, `TodoStore`) and tested with
Node's built-in test runner (no dependencies):

```bash
node --test tests/calculator.test.js tests/dom.test.js tests/todo.test.js tests/todo-dom.test.js
```

- `tests/calculator.test.js` — the calculator's arithmetic state machine
- `tests/dom.test.js` — calculator DOM wiring via a tiny inline DOM stub
- `tests/todo.test.js` — `TodoStore`: add/toggle/rename/delete, filters, counts, persistence
- `tests/todo-dom.test.js` — todo DOM wiring (rendering, editing, filters) using
  the reusable stub in `tests/fake-dom.js`

