/** @jsx h */
/** @jsxFrag Fragment */

import { Fragment, h } from "./h"
import { highlight } from "sugar-high"

import {
  demoLinks,
  failureCases,
  packInfo,
  runtimeTintPalette,
  variantDefinitions,
  webComponentComponentSource,
  webComponentInlineSource,
  webComponentLiveExamples,
} from "./content"

function escapeHtml(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function StickyNav(): string {
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <span className="topbar__name">@effective/icon</span>
        <nav className="topbar__tabs" aria-label="Demo variants">
          <a className="topbar__tab" href={demoLinks.mask}>
            {variantDefinitions.mask.tabLabel}
          </a>
          <a className="topbar__tab" href={demoLinks.image}>
            {variantDefinitions.image.tabLabel}
          </a>
          <a className="topbar__tab" href={demoLinks.svg}>
            {variantDefinitions.svg.tabLabel}
          </a>
          <a className="topbar__tab topbar__tab--active" href={demoLinks["custom-element"]} aria-current="page">
            {variantDefinitions["custom-element"].tabLabel}
          </a>
        </nav>
      </div>
    </header>
  )
}

function IconStrip(): string {
  return (
    <div className="icon-strip" aria-label="Live compile-time icon output">
      <div className="icon-slot">
        <div className="icon-frame">
          <effective-icon name="airplane" aria-hidden="true" />
        </div>
        <span className="icon-slot__name">{webComponentLiveExamples[0].title}</span>
        <code className="icon-slot__syntax">{escapeHtml(webComponentLiveExamples[0].code)}</code>
      </div>
      <div className="icon-slot">
        <div className="icon-frame">
          <effective-icon name="magic-wand-2" aria-hidden="true" />
        </div>
        <span className="icon-slot__name">{webComponentLiveExamples[1].title}</span>
        <code className="icon-slot__syntax">{escapeHtml(webComponentLiveExamples[1].code)}</code>
      </div>
    </div>
  )
}

function TintRow(): string {
  const definition = variantDefinitions["custom-element"]

  return (
    <div className="tint-row" aria-label="Runtime tint demo">
      <div className="tint-row__controls" role="group" aria-label="Select runtime tint">
        {runtimeTintPalette.map((color) => (
          <button
            type="button"
            className={`tint-row__swatch${color === definition.defaultTint ? " tint-row__swatch--active" : ""}`}
            style={{ "--tint-swatch-color": color }}
            data-demo-color-choice
            data-demo-color={color}
            aria-label={`Set tint to ${color.toUpperCase()}`}
            aria-pressed={color === definition.defaultTint}
            title={color.toUpperCase()}
          />
        ))}
        <span className="tint-row__value" data-demo-color-value>
          {definition.defaultTint.toUpperCase()}
        </span>
      </div>
      <span className="tint-row__note">{definition.colorNote}</span>
    </div>
  )
}

function CodeBlock({ code, label }: { code: string; label: string }): string {
  const highlighted = highlight(code)
  return (
    <div className="code-block">
      <div className="code-block__label">{label}</div>
      <pre className="code-block__body">
        <code>{highlighted}</code>
      </pre>
    </div>
  )
}

function DifferenceList(): string {
  return (
    <dl className="detail-list">
      {variantDefinitions["custom-element"].differences.map((item) => (
        <div className="detail-list__item">
          <dd>{escapeHtml(item)}</dd>
        </div>
      ))}
    </dl>
  )
}

function FailureList(): string {
  return (
    <ul className="detail-list">
      {failureCases.map((item) => (
        <li className="detail-list__item">{escapeHtml(item)}</li>
      ))}
    </ul>
  )
}

function PackFacts(): string {
  return (
    <dl className="fact-grid">
      <div>
        <dt>Package</dt>
        <dd>{packInfo.packageName}</dd>
      </div>
      <div>
        <dt>Family</dt>
        <dd>{packInfo.family}</dd>
      </div>
      <div>
        <dt>Style</dt>
        <dd>{packInfo.style}</dd>
      </div>
      <div>
        <dt>Icons</dt>
        <dd>{String(packInfo.iconCount)}</dd>
      </div>
    </dl>
  )
}

export function renderWebComponentDemoPage(): string {
  const definition = variantDefinitions["custom-element"]

  return (
    <>
      <StickyNav />
      <div className="page page--custom-element" data-demo-page style={{ "--demo-icon-color": definition.defaultTint }}>
        <main>
          <section className="hero">
            <div className="hero__text">
              <h1 className="hero__title">{definition.title}</h1>
              <p className="hero__tagline">{definition.lead}</p>
              <TintRow />
            </div>
            <IconStrip />
          </section>

          <section className="code-section">
            <h2 className="code-section__heading">Component usage</h2>
            <p className="code-section__note">{'Use <effective-icon> directly when surface is "custom-element".'}</p>
            <div className="code-pair">
              <div className="code-pair__panel">
                <CodeBlock label="Source" code={webComponentComponentSource} />
              </div>
              <div className="code-pair__panel">
                <CodeBlock label={`Output — ${definition.renderMode}`} code={definition.componentOutput} />
              </div>
            </div>
          </section>

          <section className="code-section">
            <h2 className="code-section__heading">Inline usage</h2>
            <p className="code-section__note">{'Use a direct <effective-icon> element as a prop value when you need inline composition.'}</p>
            <div className="code-pair">
              <div className="code-pair__panel">
                <CodeBlock label="Source" code={webComponentInlineSource} />
              </div>
              <div className="code-pair__panel">
                <CodeBlock label={`Output — ${definition.renderMode}`} code={definition.inlineOutput} />
              </div>
            </div>
          </section>

          <section className="details-grid">
            <div>
              <h2 className="details-heading">How this variant differs</h2>
              <DifferenceList />
            </div>
            <div>
              <h2 className="details-heading">Compile-time validation</h2>
              <FailureList />
            </div>
            <div>
              <h2 className="details-heading">Icon pack</h2>
              <PackFacts />
            </div>
          </section>

          <footer className="page-footer">
            <span>
              {packInfo.packageName} v{packInfo.version}
            </span>
            <span>{packInfo.license}</span>
            <a href={packInfo.sourceUrl} target="_blank" rel="noreferrer">
              Source
            </a>
          </footer>
        </main>
      </div>
    </>
  )
}
