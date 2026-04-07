import path from "node:path"

import MagicString from "magic-string"
import { Visitor, parseSync } from "oxc-parser"

import type * as ESTree from "@oxc-project/types"

import type { ResolvedIconPackage, ResolvedPackIcon } from "./resolve-package"
import {
  createA11yFallback,
  createImageFallback,
  findNameAttribute,
  getJsxAttributeExpression,
  getJsxAttributeIdentifier,
  getJsxAttributeName,
  getJsxTagName,
  renderJsxAttributes,
  styleTargetToClassPropName,
} from "./transform-jsx"
import {
  MASK_CSS_MODULE_ID,
  createInlineMaskStyle,
  getStyleExpressionSource,
  withMaskClass,
} from "./transform-mask"
import { createInlineSvgElement, parseInlineSvg } from "./transform-svg"

export const COMPILE_MODULE_ID = "@effective/icon/compile"
export const RUNTIME_MODULE_ID = "@effective/icon/runtime"

interface TransformContext {
  options: {
    package: string
    surface: "jsx"
    renderMode: "image" | "mask" | "svg"
    styleTarget?: "object" | "string"
  }
  resolvedPackage: ResolvedIconPackage
}

interface CompileBindings {
  component?: string
  importDeclarations: ESTree.ImportDeclaration[]
}

interface IconImportRecord {
  icon: ResolvedPackIcon
  importName: string
  inlineSvg?: ESTree.JSXElement
}

interface Replacement {
  start: number
  end: number
  code: string
}

class TransformState {
  private readonly iconImports = new Map<string, IconImportRecord>()
  private readonly lineStarts: number[]
  private importCounter = 0
  private needsMaskCss = false
  private needsMaskRuntime = false

  constructor(
    private readonly code: string,
    private readonly id: string,
    private readonly context: TransformContext
  ) {
    this.lineStarts = buildLineStarts(code)
  }

  get hasTransformations(): boolean {
    return this.iconImports.size > 0
  }

  ensureIcon(iconName: string): IconImportRecord {
    const existing = this.iconImports.get(iconName)
    if (existing) {
      return existing
    }

    const icon = this.context.resolvedPackage.iconsByName.get(iconName)
    if (!icon) {
      throw this.errorAtOffset(0, `Unknown icon "${iconName}" in package "${this.context.options.package}"`)
    }

    const record: IconImportRecord = {
      icon,
      importName: `__iconAsset${this.importCounter++}`,
      inlineSvg:
        this.context.options.renderMode === "svg" ? parseInlineSvg(icon.absolutePath, this.id) : undefined,
    }

    this.iconImports.set(iconName, record)
    return record
  }

  buildElement(iconName: string, attributes: ESTree.JSXAttributeItem[]): string {
    const record = this.ensureIcon(iconName)

    if (this.context.options.renderMode === "mask") {
      this.needsMaskCss = true

      const styleTarget = this.context.options.styleTarget ?? "object"
      const forwardedAttributes = attributes.filter((attribute) => getJsxAttributeName(attribute) !== "style")
      const renderedForwarded = withMaskClass(
        forwardedAttributes,
        styleTargetToClassPropName(styleTarget),
        this.code
      )
      const styleExpression = getJsxAttributeExpression(attributes, "style")
      const inlinedStyle = createInlineMaskStyle(styleExpression, record.importName, styleTarget, this.code)
      const dynamicStyleExpressionSource = getStyleExpressionSource(attributes, this.code)
      const styleAttribute =
        inlinedStyle != null
          ? `style={${inlinedStyle}}`
          : (() => {
              this.needsMaskRuntime = true
              const helperName = styleTarget === "string" ? "__iconBuildMaskStyleString" : "__iconBuildMaskStyle"
              return `style={${helperName}(${record.importName}, ${dynamicStyleExpressionSource ?? "undefined"})}`
            })()

      return renderSelfClosingElement("span", [
        ...renderedForwarded,
        styleAttribute,
        ...renderJsxAttributes(createA11yFallback(forwardedAttributes)),
      ])
    }

    if (this.context.options.renderMode === "svg") {
      return createInlineSvgElement(record.inlineSvg, record.icon.name, [...attributes, ...createA11yFallback(attributes)])
    }

    return renderSelfClosingElement("img", [
      ...renderJsxAttributes(attributes, this.code),
      `src={${record.importName}}`,
      ...renderJsxAttributes(createImageFallback(attributes)),
    ])
  }

  buildImportSource(): string {
    if (!this.hasTransformations) {
      return ""
    }

    const statements: string[] = []

    if (this.needsMaskCss) {
      statements.push(`import "${MASK_CSS_MODULE_ID}"`)
    }

    if (this.needsMaskRuntime) {
      if ((this.context.options.styleTarget ?? "object") === "string") {
        statements.push(
          `import { buildIconMaskStyleString as __iconBuildMaskStyleString } from "${RUNTIME_MODULE_ID}"`
        )
      } else {
        statements.push(`import { buildIconMaskStyle as __iconBuildMaskStyle } from "${RUNTIME_MODULE_ID}"`)
      }
    }

    for (const record of this.iconImports.values()) {
      if (this.context.options.renderMode === "svg") {
        continue
      }

      const specifier = normalizeImportPath(record.icon.absolutePath) + "?url"
      statements.push(`import ${record.importName} from ${JSON.stringify(specifier)}`)
    }

    return statements.length > 0 ? `${statements.join("\n")}\n` : ""
  }

  errorAt(node: Pick<ESTree.Span, "start">, message: string): Error {
    return this.errorAtOffset(node.start, message)
  }

  private errorAtOffset(offset: number, message: string): Error {
    const { line, character } = offsetToLineColumn(this.lineStarts, offset)
    return new Error(`${message} (${this.id}:${line}:${character})`)
  }
}

export function transformCompileTimeIcons(code: string, id: string, context: TransformContext): string | null {
  if (!looksLikeCompileTimeIconFile(code, id)) {
    return null
  }

  const parseResult = parseSync(id, code, {
    lang: getLang(id),
    sourceType: "module",
    astType: "ts",
    range: true,
  })
  const bindings = findCompileBindings(parseResult.program)
  const state = new TransformState(code, id, context)
  const replacements: Replacement[] = []

  const visitor = new Visitor({
    JSXElement(node) {
      const tagName = getJsxTagName(node)
      const activeBinding = bindings.component

      if (tagName === "effective-icon") {
        throw state.errorAt(node, 'Direct <effective-icon> authoring is no longer supported by @effective/icon')
      }

      if (!activeBinding && tagName === "Icon") {
        throw state.errorAt(node, `Import { Icon } from "${COMPILE_MODULE_ID}" before using compile-time icons`)
      }

      if (activeBinding && tagName === activeBinding) {
        replacements.push({
          start: node.start,
          end: node.end,
          code: transformJsxIcon(node, state),
        })
      }
    },
  })

  visitor.visit(parseResult.program)

  if (!state.hasTransformations) {
    return null
  }

  const magicString = new MagicString(code)

  for (const replacement of replacements.sort((left, right) => right.start - left.start)) {
    magicString.overwrite(replacement.start, replacement.end, replacement.code)
  }

  for (const declaration of [...bindings.importDeclarations].sort((left, right) => right.start - left.start)) {
    magicString.remove(declaration.start, declaration.end)
  }

  const generatedImports = state.buildImportSource()
  if (generatedImports) {
    const insertAt = parseResult.program.body[0]?.start ?? 0
    magicString.prependLeft(insertAt, generatedImports)
  }

  return magicString.toString()
}

function transformJsxIcon(node: ESTree.JSXElement, state: TransformState): string {
  if (!node.openingElement.selfClosing || node.closingElement) {
    throw state.errorAt(node, "Compile-time <Icon> does not support children")
  }

  const attributes = node.openingElement.attributes
  const nameAttribute = findNameAttribute(attributes)

  if (
    !nameAttribute ||
    !nameAttribute.value ||
    nameAttribute.value.type !== "Literal" ||
    typeof nameAttribute.value.value !== "string"
  ) {
    throw state.errorAt(node, 'Compile-time <Icon> requires name="literal"')
  }

  const forwarded: ESTree.JSXAttributeItem[] = []

  for (const attribute of attributes) {
    if (attribute.type === "JSXSpreadAttribute") {
      throw state.errorAt(attribute, "Compile-time <Icon> does not support spread props")
    }

    const attributeName = getJsxAttributeIdentifier(attribute.name)
    if (attributeName === "name") {
      continue
    }

    if (isReservedAttribute(attributeName)) {
      throw state.errorAt(attribute, `Prop "${attributeName}" is reserved by @effective/icon`)
    }

    forwarded.push(attribute)
  }

  return state.buildElement(nameAttribute.value.value, forwarded)
}

function findCompileBindings(program: ESTree.Program): CompileBindings {
  const bindings: CompileBindings = {
    importDeclarations: [],
  }

  const visitor = new Visitor({
    ImportDeclaration(node) {
      if (node.source.value !== COMPILE_MODULE_ID) {
        return
      }

      bindings.importDeclarations.push(node)

      for (const specifier of node.specifiers ?? []) {
        if (specifier.type !== "ImportSpecifier" || specifier.importKind === "type") {
          continue
        }

        const importedName =
          specifier.imported.type === "Identifier" ? specifier.imported.name : String(specifier.imported.value)

        if (importedName === "Icon") {
          bindings.component = specifier.local.name
        }
      }
    },
  })

  visitor.visit(program)
  return bindings
}

function isReservedAttribute(name: string): boolean {
  return name === "src"
}

function looksLikeCompileTimeIconFile(code: string, id: string): boolean {
  const filePath = id.replace(/\?.*$/, "")
  const extension = path.extname(filePath)

  if (![".ts", ".tsx", ".js", ".jsx", ".mdx"].includes(extension)) {
    return false
  }

  return code.includes("Icon") || code.includes("effective-icon") || code.includes(COMPILE_MODULE_ID)
}

function getLang(id: string): "js" | "jsx" | "ts" | "tsx" {
  const extension = path.extname(id.replace(/\?.*$/, ""))

  switch (extension) {
    case ".tsx":
    case ".mdx":
      return "tsx"
    case ".jsx":
      return "jsx"
    case ".js":
      return "js"
    default:
      return "ts"
  }
}

function renderSelfClosingElement(tagName: string, attributes: string[]): string {
  return attributes.length > 0 ? `<${tagName} ${attributes.join(" ")} />` : `<${tagName} />`
}

function normalizeImportPath(filePath: string): string {
  return filePath.split(path.sep).join(path.posix.sep)
}

function buildLineStarts(source: string): number[] {
  const starts = [0]

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\n") {
      starts.push(index + 1)
    }
  }

  return starts
}

function offsetToLineColumn(lineStarts: number[], offset: number): { line: number; character: number } {
  let low = 0
  let high = lineStarts.length - 1

  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    if (lineStarts[middle]! <= offset) {
      low = middle + 1
    } else {
      high = middle - 1
    }
  }

  const lineIndex = Math.max(high, 0)
  return {
    line: lineIndex + 1,
    character: offset - lineStarts[lineIndex]! + 1,
  }
}
