/** @jsxImportSource solid-js */

import { Icon } from "@effective/icon/compile"

export function App() {
  return (
    <section class="fixture" data-framework="solid">
      <h1>Solid Fixture</h1>
      <div class="icon-grid">
        <Icon name="airplane" class="icon icon--airplane" aria-label="Airplane" />
        <div class="icon icon--magic-wand-2">
          <Icon name="magic-wand-2" aria-label="Magic wand" />
        </div>
      </div>
    </section>
  )
}
