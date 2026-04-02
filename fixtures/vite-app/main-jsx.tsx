/** @jsx h */
/** @jsxFrag Fragment */

import { Fragment, h } from "./h"

import { Icon } from "@effective/icon/compile"

export function renderFixtureApp({ renderMode, surface }: { renderMode: string; surface: string }): string {
  return (
    <section data-surface={surface} data-render-mode={renderMode}>
      <h1>Compile-Time Streamline Fixture</h1>
      <div className="icon-grid">
        <Icon name="airplane" className="icon icon--airplane" aria-label="Airplane" />
        <div className="icon icon--add-1">
          <Icon name="add-1" aria-label="Add" />
        </div>
      </div>
    </section>
  )
}
