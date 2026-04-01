import type { DemoVariantKey } from "./content"
import { renderDemoPage } from "./render"

export function mountDemoPage(root: HTMLElement, variant: DemoVariantKey): void {
  root.innerHTML = renderDemoPage(variant)

  const page = root.querySelector<HTMLElement>("[data-demo-page]")
  const value = root.querySelector<HTMLElement>("[data-demo-color-value]")
  const choices = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-demo-color-choice]"))

  if (!page || !value || choices.length === 0) {
    return
  }

  const applyTint = (nextColor: string): void => {
    page.style.setProperty("--demo-icon-color", nextColor)
    value.textContent = nextColor.toUpperCase()

    for (const choice of choices) {
      const isActive = choice.dataset.demoColor === nextColor
      choice.setAttribute("aria-pressed", String(isActive))
      choice.classList.toggle("tint-control__swatch--active", isActive)
    }
  }

  const initialChoice =
    choices.find((choice) => choice.classList.contains("tint-control__swatch--active")) ??
    choices.find((choice) => choice.dataset.demoColor === page.style.getPropertyValue("--demo-icon-color")) ??
    choices[0]

  if (!initialChoice?.dataset.demoColor) {
    return
  }

  applyTint(initialChoice.dataset.demoColor)

  for (const choice of choices) {
    choice.addEventListener("click", () => {
      const nextColor = choice.dataset.demoColor
      if (!nextColor) {
        return
      }

      applyTint(nextColor)
    })
  }
}
