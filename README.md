# IntelliFlow

IntelliFlow is a keyboard-first Chrome extension for switching AI chat models
and reasoning levels. Version 0.1 supports ChatGPT and reads the account's live
model/reasoning menus instead of shipping a hard-coded option list.

## Shortcuts

| Action | macOS default | Other platforms |
| --- | --- | --- |
| Cycle model | `Control + Option + M` (in-page) | `Ctrl + Shift + M` |
| Cycle reasoning level | `Control + Option + H` (in-page) | `Ctrl + Shift + H` |

Keep the modifiers held and press `M` or `H` repeatedly to preview choices, then
release `Control` or `Option` to apply once. Press `Esc`, click the blurred
backdrop, or leave the page to cancel. The live menu is cached briefly, so
subsequent sessions open immediately instead of operating the ChatGPT menu on
every key press.

Users can reassign either Chrome-managed command at
`chrome://extensions/shortcuts` or through the extension settings page. Chrome
does not accept `Control + Option` as a manifest command, so IntelliFlow captures
that requested macOS default directly on ChatGPT; the Chrome-managed fallback is
`Control + Shift + M/H`.

## Development

Requirements: Node.js 22 or newer and Chrome.

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run check
```

The stable unpacked Chrome extension is emitted to `dist/chrome-mv3/`.

## Manual installation

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose `dist/chrome-mv3/`.
5. Open ChatGPT and use the shortcuts above.

## Design and architecture

- WXT owns Manifest V3 entrypoints, commands, and packaging.
- React renders the popup, options page, and isolated page overlay.
- Tailwind CSS supplies layout utilities; Vercel-inspired tokens from
  `DESIGN.md` define the visual system.
- Website behavior is behind the `SiteAdapter` interface. See
  [`docs/architecture.md`](docs/architecture.md).
- Project-scoped Codex tracing setup is documented in
  [`docs/langfuse-observability.md`](docs/langfuse-observability.md).

IntelliFlow operates locally on the active page. It does not read conversation
body text or upload ChatGPT page content.
