import { describe, expect, it } from "vitest"

import {
  EFFECTIVE_ICON_MASK_IMAGE_VAR_NAME,
  buildIconMaskStyle,
  buildIconMaskStyleString,
} from "../src/runtime"

describe("@effective/icon runtime", () => {
  it("builds object styles with the mask image variable", () => {
    expect(buildIconMaskStyle("/icons/airplane.svg")).toEqual({
      [EFFECTIVE_ICON_MASK_IMAGE_VAR_NAME]: 'url("/icons/airplane.svg")',
    })
  })

  it("merges object styles without dropping existing properties", () => {
    expect(
      buildIconMaskStyle("/icons/airplane.svg", {
        color: "tomato",
        "--accent-color": "gold",
      })
    ).toEqual({
      [EFFECTIVE_ICON_MASK_IMAGE_VAR_NAME]: 'url("/icons/airplane.svg")',
      color: "tomato",
      "--accent-color": "gold",
    })
  })

  it("builds CSS text for string styles", () => {
    expect(buildIconMaskStyleString("/icons/airplane.svg", "color:tomato;")).toBe(
      `${EFFECTIVE_ICON_MASK_IMAGE_VAR_NAME}:url("/icons/airplane.svg");color:tomato;`
    )
  })

  it("serializes object styles as CSS text for string targets", () => {
    expect(
      buildIconMaskStyleString("/icons/airplane.svg", {
        backgroundColor: "tomato",
        WebkitMaskSize: "cover",
        "--accent-color": "gold",
      })
    ).toBe(
      `${EFFECTIVE_ICON_MASK_IMAGE_VAR_NAME}:url("/icons/airplane.svg");background-color:tomato;-webkit-mask-size:cover;--accent-color:gold;`
    )
  })

  it("ignores non-object values for object targets and non-string values for string targets", () => {
    expect(buildIconMaskStyle("/icons/airplane.svg", undefined)).toEqual({
      [EFFECTIVE_ICON_MASK_IMAGE_VAR_NAME]: 'url("/icons/airplane.svg")',
    })

    expect(buildIconMaskStyleString("/icons/airplane.svg", undefined)).toBe(
      `${EFFECTIVE_ICON_MASK_IMAGE_VAR_NAME}:url("/icons/airplane.svg");`
    )
  })
})
