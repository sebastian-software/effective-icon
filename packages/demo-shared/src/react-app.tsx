import { highlight } from "sugar-high"

import { Icon } from "@effective/icon/compile"

import { demoNavSections, demoRouteByKey, type DemoKey } from "./catalog"
import { demoLinks, getDemoPageDefinition, getProofSyntax, packInfo } from "./content"

function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div className="code-block">
      <div className="code-block__label">{label}</div>
      <pre className="code-block__body">
        <code dangerouslySetInnerHTML={{ __html: highlight(code) }} />
      </pre>
    </div>
  )
}

function StickyNav({ current }: { current: DemoKey }) {
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <span className="topbar__name">@effective/icon</span>
        <nav className="topbar__nav" aria-label="Demo navigation">
          {demoNavSections.map((section) => (
            <div className="topbar__section" key={section.label}>
              <span className="topbar__section-label">{section.label}</span>
              <div className="topbar__section-groups">
                {section.groups.map((group) => (
                  <div className="topbar__group" key={group.label}>
                    <span className="topbar__group-label">{group.label}</span>
                    <div className="topbar__tabs">
                      {group.keys.map((key) => (
                        <a
                          key={key}
                          className={`topbar__tab${current === key ? " topbar__tab--active" : ""}`}
                          href={demoLinks[key]}
                          aria-current={current === key ? "page" : undefined}
                        >
                          {demoRouteByKey[key].navLabel}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </header>
  )
}

export function ReactDemoApp({ demo }: { demo: DemoKey }) {
  const definition = getDemoPageDefinition(demo)
  const route = definition.route

  return (
    <>
      <StickyNav current={demo} />
      <div className={`page page--${route.renderMode}`} data-demo-page="">
        <main>
          <section className="hero">
            <div className="hero__text">
              <p className="hero__eyebrow">{route.familyLabel}</p>
              <h1 className="hero__title">{route.title}</h1>
              <p className="hero__tagline">{route.lead}</p>
            </div>
            <div className="proof-card">
              <div className="proof-card__icon">
                <Icon name="airplane" className="status-icon" aria-hidden="true" />
              </div>
              <div className="proof-card__copy">
                <span className="proof-card__eyebrow">Live proof</span>
                <strong className="proof-card__title">{definition.proofLabel}</strong>
                <code className="proof-card__syntax">{getProofSyntax()}</code>
              </div>
            </div>
          </section>

          <section className="code-section">
            <div className="code-pair">
              <div className="code-pair__panel">
                <CodeBlock label={definition.sourceLabel} code={definition.sourceCode} />
              </div>
              <div className="code-pair__panel">
                <CodeBlock label={definition.outputLabel} code={definition.outputCode} />
              </div>
            </div>
          </section>

          <section className="facts-section">
            <h2 className="facts-section__heading">Demo facts</h2>
            <dl className="fact-grid">
              {definition.facts.map((fact) => (
                <div className="fact-grid__item" key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
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
