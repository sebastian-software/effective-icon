import { afterEach, expect, test } from "vitest"
import { page } from "vitest/browser"
import { createRoot, type Root } from "react-dom/client"

import { Icon } from "@effective/icon/compile"

import "./mask-visual.css"

import { waitForVisualReady } from "./mask-visual.shared"

let root: Root | undefined

afterEach(() => {
  root?.unmount()
  root = undefined
  document.body.innerHTML = ""
})

test("renders the React mask icon visibly at the expected size", async () => {
  const app = document.createElement("div")
  app.id = "app"
  document.body.append(app)

  root = createRoot(app)
  root.render(
    <div className="visual-mask-fixture">
      <div className="visual-mask-card" data-testid="visual-mask-card">
        <Icon name="airplane" className="visual-mask-icon" aria-label="Airplane" />
      </div>
    </div>
  )

  await waitForVisualReady()

  await (expect.element(page.getByTestId("visual-mask-card")) as any).toMatchScreenshot("react-mask-card.png")
})
