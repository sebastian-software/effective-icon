/** @jsx h */
/** @jsxFrag Fragment */

import { Fragment, h } from "./h"

import { Icon, icon } from "vite-plugin-streamline/compile"

import {
  authoringSnippet,
  demoLinks,
  failureCases,
  liveExamples,
  packInfo,
  runtimeTintPalette,
  type DemoVariantKey,
  variantDefinitions,
} from "./content"

function escapeHtml(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function CodeBlock({ code, label }: { code: string; label: string }): string {
  return (
    <div className="code-block">
      <div className="eyebrow">{label}</div>
      <pre className="code-block__body">
        <code>{escapeHtml(code)}</code>
      </pre>
    </div>
  )
}

function ColorControl({ current }: { current: DemoVariantKey }): string {
  const definition = variantDefinitions[current]

  return (
    <div className="tint-control" aria-label="Runtime tint demo">
      <div className="tint-control__label">Runtime tint</div>
      <div className="tint-control__row" role="group" aria-label="Select runtime tint">
        {runtimeTintPalette.map((color) => (
          <button
            type="button"
            className={`tint-control__swatch${color === definition.defaultTint ? " tint-control__swatch--active" : ""}`}
            style={{ "--tint-swatch-color": color }}
            data-demo-color-choice
            data-demo-color={color}
            aria-label={`Set tint to ${color.toUpperCase()}`}
            aria-pressed={color === definition.defaultTint}
            title={color.toUpperCase()}
          />
        ))}
        <span className="tint-control__value" data-demo-color-value>
          {definition.defaultTint.toUpperCase()}
        </span>
      </div>
      <p className="tint-control__note">
        {definition.supportsRuntimeTinting ? "Runtime tinting supported." : "Runtime tinting not supported."}{" "}
        {definition.colorNote}
      </p>
    </div>
  )
}

function IconStrip(): string {
  return (
    <div className="icon-strip" aria-label="Live compile-time icon output">
      <div className="icon-slot">
        <div className="icon-frame">
          <Icon name="airplane" className="demo-icon" aria-hidden="true" />
        </div>
        <span>{liveExamples[0].title}</span>
        <div className="icon-source">
          <div className="icon-source__label">{liveExamples[0].label}</div>
          <pre className="icon-source__body">
            <code>{escapeHtml(liveExamples[0].code)}</code>
          </pre>
        </div>
      </div>
      <div className="icon-slot">
        <div className="icon-frame">{icon`add-1`}</div>
        <span>{liveExamples[1].title}</span>
        <div className="icon-source">
          <div className="icon-source__label">{liveExamples[1].label}</div>
          <pre className="icon-source__body">
            <code>{escapeHtml(liveExamples[1].code)}</code>
          </pre>
        </div>
      </div>
      <div className="icon-slot">
        <div className="icon-frame">
          <Icon name="anchor" className="demo-icon" aria-label="Anchor" />
        </div>
        <span>{liveExamples[2].title}</span>
        <div className="icon-source">
          <div className="icon-source__label">{liveExamples[2].label}</div>
          <pre className="icon-source__body">
            <code>{escapeHtml(liveExamples[2].code)}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}

function DifferenceList({ current }: { current: DemoVariantKey }): string {
  const definition = variantDefinitions[current]

  return (
    <dl className="difference-list">
      {definition.differences.map((item, index) => (
        <div>
          <dt>Difference {String(index + 1)}</dt>
          <dd>{escapeHtml(item)}</dd>
        </div>
      ))}
    </dl>
  )
}

function VariantLinks({ current }: { current: DemoVariantKey }): string {
  return (
    <nav className="variant-nav" aria-label="Demo variants">
      <a className={`variant-link${current === "image" ? " variant-link--current" : ""}`} href={demoLinks.image}>
        JSX image
      </a>
      <a className={`variant-link${current === "mask" ? " variant-link--current" : ""}`} href={demoLinks.mask}>
        JSX mask
      </a>
      <a
        className={`variant-link${current === "inline-svg" ? " variant-link--current" : ""}`}
        href={demoLinks["inline-svg"]}
      >
        JSX inline SVG
      </a>
      <a
        className={`variant-link${current === "web-component" ? " variant-link--current" : ""}`}
        href={demoLinks["web-component"]}
      >
        Web component
      </a>
    </nav>
  )
}

function FailureList(): string {
  return (
    <ul className="failure-list">
      {failureCases.map((item) => (
        <li>{escapeHtml(item)}</li>
      ))}
    </ul>
  )
}

function PackFacts(): string {
  return (
    <dl className="fact-list">
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
        <dt>Icon count</dt>
        <dd>{String(packInfo.iconCount)}</dd>
      </div>
    </dl>
  )
}

export function renderDemoPage(variant: DemoVariantKey): string {
  const definition = variantDefinitions[variant]

  return (
    <div
      className={`page page--${variant}`}
      data-demo-page
      style={{ "--demo-icon-color": definition.defaultTint }}
    >
      <header className="masthead">
        <p className="eyebrow">vite-plugin-streamline demo</p>
        <h1>{definition.title}</h1>
        <p className="masthead__lead">
          {definition.lead} The authoring source stays the same. Only the compile target changes.
        </p>
        <VariantLinks current={variant} />
      </header>

      <section className="section">
        <div className="section__intro">
          <p className="eyebrow">Live proof</p>
          <h2>Shared source, real output.</h2>
          <p>
            All three demos resolve against <code>{packInfo.packageName}</code> and use the same icon names. The strip
            below is rendered by this build, not mocked in the browser.
          </p>
          <p>
            These tiles are not the output modes. They are three icon references from the same authored source so you
            can see this variant rendering multiple icons consistently. Each tile also shows the exact authoring marker
            a user would write.
          </p>
        </div>
        <ColorControl current={variant} />
        <IconStrip />
      </section>

      <section className="section section--split">
        <div>
          <div className="section__intro">
            <p className="eyebrow">Authoring</p>
            <h2>Compile-time markers only.</h2>
          </div>
          <CodeBlock label="Source" code={authoringSnippet} />
        </div>
        <div>
          <div className="section__intro">
            <p className="eyebrow">Resulting shape</p>
            <h2>{escapeHtml(definition.liveElement)} for this variant.</h2>
            <p>
              This app is configured as <code>{definition.renderMode}</code>, so the emitted shape below is the contract
              you are testing in this project.
            </p>
          </div>
          <DifferenceList current={variant} />
          <CodeBlock label="Representative output" code={definition.outputSnippet} />
        </div>
      </section>

      <section className="section section--split">
        <div>
          <div className="section__intro">
            <p className="eyebrow">Compile-time guarantees</p>
            <h2>Validation stays constant across targets.</h2>
          </div>
          <FailureList />
        </div>
        <div>
          <div className="section__intro">
            <p className="eyebrow">Selected pack</p>
            <h2>Manifest-backed metadata.</h2>
            <p>
              The build is tied to one pack before runtime. That is why missing names fail fast instead of silently
              falling through.
            </p>
          </div>
          <PackFacts />
          <p className="pack-note">
            Source:{" "}
            <a href={packInfo.sourceUrl} target="_blank" rel="noreferrer">
              {packInfo.sourceUrl}
            </a>{" "}
            | Version {packInfo.version} | License {packInfo.license}
          </p>
        </div>
      </section>
    </div>
  )
}
