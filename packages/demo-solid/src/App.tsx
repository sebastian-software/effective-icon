/** @jsxImportSource solid-js */

import { Icon } from "@effective/icon/compile"

const snippet = `import { Icon } from "@effective/icon/compile"

function StatusCard() {
  return (
    <div class="status-card">
      <Icon name="airplane" class="status-card__icon" aria-hidden="true" />
      <span>Flight mode active</span>
    </div>
  )
}`

export function App() {
  return (
    <div class="page">
      <section class="hero">
        <div>
          <p class="eyebrow">SolidJS consumer proof</p>
          <h1 class="title">Compile-time icons inside a real Solid app.</h1>
          <p class="lead">
            This demo runs through <code>vite-plugin-solid</code> and the effective icon transform together. The source
            uses idiomatic Solid TSX with <code>class</code> attributes, while the plugin still emits static SVG-backed
            output at build time.
          </p>
          <ul class="proof-list">
            <li>Solid component tree renders with the real Solid runtime.</li>
            <li>The icon plugin still validates names against the selected package.</li>
            <li>This demo uses the `jsx` surface with `renderMode: "svg"`.</li>
          </ul>
        </div>

        <aside class="preview">
          <p class="preview__label">Live preview</p>
          <div class="icon-row">
            <div class="icon-card">
              <div class="icon-shell">
                <Icon name="airplane" aria-hidden="true" />
              </div>
              <span class="icon-name">airplane</span>
            </div>

            <div class="icon-card">
              <div class="icon-shell">
                <Icon name="magic-wand-2" aria-hidden="true" />
              </div>
              <span class="icon-name">magic-wand-2</span>
            </div>

            <div class="icon-card">
              <div class="icon-shell">
                <Icon name="anchor" aria-hidden="true" />
              </div>
              <span class="icon-name">anchor</span>
            </div>
          </div>
        </aside>
      </section>

      <section class="code-block">
        <strong>Source shape</strong>
        <pre>{snippet}</pre>
      </section>

      <footer class="footer">
        <span>@effective/icon</span>
        <span>SolidJS + Vite + compile-time icon resolution</span>
      </footer>
    </div>
  )
}
