/** @jsx h */
/** @jsxFrag Fragment */

import "./styles.css"

import { Fragment, h } from "./h"

import { Icon } from "vite-plugin-streamline/compile"

const app = document.querySelector<HTMLDivElement>("#app")

if (!app) {
  throw new Error("Missing #app root element")
}

app.innerHTML = (
  <div className="shell">
    <header className="hero">
      <p className="hero__eyebrow">GitHub Pages Demo</p>
      <h1 className="hero__title">Compile-time Streamline icons, rendered from a pack manifest.</h1>
      <p className="hero__lede">
        This page uses the new compile-time rewrite path. The icons are statically resolved from a single selected pack.
      </p>
    </header>

    <section className="gallery" aria-label="Icon gallery">
      <article className="icon-card icon-card--0">
        <div className="icon-card__art" aria-hidden="true">
          <Icon name="rocket" className="hero__demo-icon" />
        </div>
        <div className="icon-card__meta">
          <p className="icon-card__name">rocket</p>
          <p className="icon-card__style">core-line-free</p>
        </div>
      </article>

      <article className="icon-card icon-card--1">
        <div className="icon-card__art" aria-hidden="true">
          <Icon name="search" className="hero__demo-icon" />
        </div>
        <div className="icon-card__meta">
          <p className="icon-card__name">search</p>
          <p className="icon-card__style">core-line-free</p>
        </div>
      </article>

      <article className="icon-card icon-card--2">
        <div className="icon-card__art" aria-hidden="true">
          <Icon name="anchor" className="hero__demo-icon" />
        </div>
        <div className="icon-card__meta">
          <p className="icon-card__name">anchor</p>
          <p className="icon-card__style">core-line-free</p>
        </div>
      </article>
    </section>
  </div>
)
