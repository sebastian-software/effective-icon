/** @jsxImportSource solid-js */

import { afterEach, expect, test } from "vitest"
import { page } from "vitest/browser"
import { render } from "solid-js/web"

import { Icon } from "@effective/icon/compile"

import "./mask-visual.css"

import { waitForVisualReady } from "./mask-visual.shared"

let dispose: (() => void) | undefined

afterEach(() => {
  dispose?.()
  dispose = undefined
  document.body.innerHTML = ""
})

test("renders the Solid mask icon visibly at the expected size", async () => {
  const app = document.createElement("div")
  app.id = "app"
  document.body.append(app)

  dispose = render(
    () => (
      <div class="visual-mask-fixture">
        <div class="visual-mask-card" data-testid="visual-mask-card">
          <Icon name="airplane" class="visual-mask-icon" aria-label="Airplane" />
        </div>
      </div>
    ),
    app
  )

  await waitForVisualReady()

  await (expect.element(page.getByTestId("visual-mask-card")) as any).toMatchScreenshot("solid-mask-card.png")
})
