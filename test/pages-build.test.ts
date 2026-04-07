import { mkdtemp, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { copyReleasePackArtifacts, renderPagesIndexHtml, loadReleasePackSummaries } from "../scripts/pages"

const tempDirs: string[] = []
const repoRoot = path.resolve(process.cwd())

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await import("node:fs/promises").then(({ rm }) => rm(dir, { recursive: true, force: true }))
    })
  )
})

describe("pages site build", () => {
  it("renders a combined index with demos and icon packs", async () => {
    const summaries = await loadReleasePackSummaries(repoRoot)
    const html = renderPagesIndexHtml(summaries)

    expect(html).toContain("Framework demos")
    expect(html).toContain("Icon packs")
    expect(html).toContain("@icon-pkg/streamline-core-line-free")
    expect(html).toContain("./packs/core-line-free/")
    expect(html).toContain("./react-image/")
    expect(html).toContain("998 icons")
    expect(html).toContain("14 px grid")
    expect(html).toContain("Clean line icons with consistent stroke weight.")
  })

  it("copies published pack artifacts into the pages output", async () => {
    const outputRoot = await mkdtemp(path.join(tmpdir(), "effective-icon-pages-"))
    tempDirs.push(outputRoot)

    await copyReleasePackArtifacts(repoRoot, outputRoot)

    const copiedIndex = await readFile(path.join(outputRoot, "packs", "core-line-free", "index.html"), "utf8")
    const copiedIcon = await readFile(path.join(outputRoot, "packs", "core-line-free", "icons", "add-1.svg"), "utf8")

    expect(copiedIndex).toContain("@icon-pkg/streamline-core-line-free")
    expect(copiedIndex).toContain("Interface Essential")
    expect(copiedIcon).toContain("<svg")
  })
})
