/** @jsx h */
/** @jsxFrag Fragment */

import { Fragment, h } from "./h"

export function renderFixtureApp({ renderMode, surface }: { renderMode: string; surface: string }): string {
  return (
    <section data-surface={surface} data-render-mode={renderMode}>
      <h1>Compile-Time Streamline Fixture</h1>
      <div className="icon-grid">
        <effective-icon name="airplane" className="icon icon--airplane" aria-label="Airplane" />
        <div className="icon icon--add-1">
          <effective-icon name="add-1" aria-label="Add" />
        </div>
      </div>
    </section>
  )
}
