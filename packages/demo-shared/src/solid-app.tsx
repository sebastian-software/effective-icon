/** @jsxImportSource solid-js */

import { For } from "solid-js"
import { highlight } from "sugar-high"

import { Icon } from "@effective/icon/compile"

import { demoNavSections, demoRouteByKey, type DemoKey } from "./catalog"
import { demoLinks, getDemoPageDefinition, getProofSyntax, packInfo } from "./content"

function CodeBlock(props: { code: string; label: string }) {
  return (
    <div class="code-block">
      <div class="code-block__label">{props.label}</div>
      <pre class="code-block__body">
        <code innerHTML={highlight(props.code)} />
      </pre>
    </div>
  )
}

function StickyNav(props: { current: DemoKey }) {
  return (
    <header class="topbar">
      <div class="topbar__inner">
        <span class="topbar__name">@effective/icon</span>
        <nav class="topbar__nav" aria-label="Demo navigation">
          <For each={demoNavSections}>
            {(section) => (
              <div class="topbar__section">
                <span class="topbar__section-label">{section.label}</span>
                <div class="topbar__section-groups">
                  <For each={section.groups}>
                    {(group) => (
                      <div class="topbar__group">
                        <span class="topbar__group-label">{group.label}</span>
                        <div class="topbar__tabs">
                          <For each={group.keys}>
                            {(key) => (
                              <a
                                class={`topbar__tab${props.current === key ? " topbar__tab--active" : ""}`}
                                href={demoLinks[key]}
                                aria-current={props.current === key ? "page" : undefined}
                              >
                                {demoRouteByKey[key].navLabel}
                              </a>
                            )}
                          </For>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
        </nav>
      </div>
    </header>
  )
}

export function SolidDemoApp(props: { demo: DemoKey }) {
  const definition = getDemoPageDefinition(props.demo)
  const route = definition.route

  return (
    <>
      <StickyNav current={props.demo} />
      <div class={`page page--${route.renderMode}`} data-demo-page>
        <main>
          <section class="hero">
            <div class="hero__text">
              <p class="hero__eyebrow">{route.familyLabel}</p>
              <h1 class="hero__title">{route.title}</h1>
              <p class="hero__tagline">{route.lead}</p>
            </div>
            <div class="proof-card">
              <div class="proof-card__icon">
                <Icon name="airplane" class="status-icon" aria-hidden="true" />
              </div>
              <div class="proof-card__copy">
                <span class="proof-card__eyebrow">Live proof</span>
                <strong class="proof-card__title">{definition.proofLabel}</strong>
                <code class="proof-card__syntax">{getProofSyntax()}</code>
              </div>
            </div>
          </section>

          <section class="code-section">
            <div class="code-pair">
              <div class="code-pair__panel">
                <CodeBlock label={definition.sourceLabel} code={definition.sourceCode} />
              </div>
              <div class="code-pair__panel">
                <CodeBlock label={definition.outputLabel} code={definition.outputCode} />
              </div>
            </div>
          </section>

          <section class="facts-section">
            <h2 class="facts-section__heading">Demo facts</h2>
            <dl class="fact-grid">
              <For each={definition.facts}>
                {(fact) => (
                  <div class="fact-grid__item">
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                )}
              </For>
            </dl>
          </section>

          <footer class="page-footer">
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
