# Labs

A small collection of experiments. Currently it contains a responsive calculator
built with plain **HTML**, **CSS** and **JavaScript** — no frameworks, no build step.

## Live preview

**https://raw.githack.com/khalid8687/Labs/main/index.html**

The repository is also ready for GitHub Pages: a `gh-pages` branch holds the site,
so enabling *Settings → Pages → Deploy from a branch → `gh-pages`* publishes it at
**https://khalid8687.github.io/Labs/**.

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

### Run it

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

### Tests

The calculator logic is isolated in a `Calculator` class and tested with Node's
built-in test runner (no dependencies):

```bash
node --test tests/calculator.test.js tests/dom.test.js
```

`tests/calculator.test.js` covers the arithmetic state machine;
`tests/dom.test.js` uses a tiny DOM stub to check that the buttons in
`index.html` are wired up and that keyboard input works.
