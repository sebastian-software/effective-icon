import path from "node:path"

import ts from "typescript"

import type { ResolvedIconPackage, ResolvedPackIcon } from "./resolve-package"
import {
  createA11yFallback,
  createDefaultImport,
  createExpressionAttribute,
  createImageFallback,
  createJsxElement,
  createNamedImport,
  createSideEffectImport,
  findNameAttribute,
  getJsxAttributeExpression,
  getJsxAttributeIdentifier,
  getJsxAttributeName,
  getJsxTagName,
  styleTargetToClassPropName,
} from "./transform-jsx"
import { MASK_CSS_MODULE_ID, createInlineMaskStyle, withMaskClass } from "./transform-mask"
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
}

interface IconImportRecord {
  icon: ResolvedPackIcon
  importName: string
  inlineSvg?: ts.JsxElement | ts.JsxSelfClosingElement
}

class TransformState {
  private iconImports = new Map<string, IconImportRecord>()
  private importCounter = 0
  private needsMaskCss = false
  private needsMaskRuntime = false

  constructor(
    private readonly sourceFile: ts.SourceFile,
    private readonly context: TransformContext
  ) {}

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
      throw this.errorAt(this.sourceFile, `Unknown icon "${iconName}" in package "${this.context.options.package}"`)
    }

    const record: IconImportRecord = {
      icon,
      importName: `__iconAsset${this.importCounter++}`,
      inlineSvg:
        this.context.options.renderMode === "svg" ? parseInlineSvg(icon.absolutePath, this.sourceFile.fileName) : undefined,
    }

    this.iconImports.set(iconName, record)
    return record
  }

  buildStatements(statements: readonly ts.Statement[]): readonly ts.Statement[] {
    if (!this.hasTransformations) {
      return statements
    }

    const leadingImports = this.buildImportStatements()
    const retainedStatements = statements.filter((statement) => !isCompileImport(statement))
    const registrationStatements = this.buildRegistrationStatements()

    return [...leadingImports, ...registrationStatements, ...retainedStatements]
  }

  buildElement(iconName: string, attributes: ts.JsxAttributeLike[]): ts.JsxSelfClosingElement | ts.JsxElement {
    const record = this.ensureIcon(iconName)

    if (this.context.options.renderMode === "mask") {
      this.needsMaskCss = true

      const forwarded = withMaskClass(
        attributes.filter((attribute) => getJsxAttributeName(attribute) !== "style"),
        styleTargetToClassPropName(this.context.options.styleTarget ?? "object")
      )
      const styleExpression = getJsxAttributeExpression(attributes, "style")
      const styleTarget = this.context.options.styleTarget ?? "object"
      const inlinedStyle = createInlineMaskStyle(styleExpression, record.importName, styleTarget)
      const styleAttribute =
        inlinedStyle != null
          ? createExpressionAttribute("style", inlinedStyle)
          : (() => {
              this.needsMaskRuntime = true

              return createExpressionAttribute(
                "style",
                ts.factory.createCallExpression(
                  ts.factory.createIdentifier(
                    styleTarget === "string" ? "__iconBuildMaskStyleString" : "__iconBuildMaskStyle"
                  ),
                  undefined,
                  [ts.factory.createIdentifier(record.importName), styleExpression ?? ts.factory.createIdentifier("undefined")]
                )
              )
            })()

      return createJsxElement("span", [
        ...forwarded,
        styleAttribute,
        ...createA11yFallback(forwarded),
      ])
    }

    if (this.context.options.renderMode === "svg") {
      return createInlineSvgElement(record.inlineSvg, record.icon.name, [...attributes, ...createA11yFallback(attributes)])
    }

    return createJsxElement("img", [
      ...attributes,
      createExpressionAttribute("src", ts.factory.createIdentifier(record.importName)),
      ...createImageFallback(attributes),
    ])
  }

  errorAt(node: ts.Node, message: string): Error {
    const start = node.getStart(this.sourceFile)
    const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(start)
    return new Error(`${message} (${this.sourceFile.fileName}:${line + 1}:${character + 1})`)
  }

  private buildImportStatements(): ts.Statement[] {
    const statements: ts.Statement[] = []
    const runtimeBindings: Array<[string, string]> = []

    if (this.needsMaskCss) {
      statements.push(createSideEffectImport(MASK_CSS_MODULE_ID))
    }

    if (this.needsMaskRuntime) {
      if ((this.context.options.styleTarget ?? "object") === "string") {
        runtimeBindings.push(["buildIconMaskStyleString", "__iconBuildMaskStyleString"])
      } else {
        runtimeBindings.push(["buildIconMaskStyle", "__iconBuildMaskStyle"])
      }
    }

    if (runtimeBindings.length > 0) {
      statements.push(createNamedImport(RUNTIME_MODULE_ID, runtimeBindings))
    }

    for (const record of this.iconImports.values()) {
      if (this.context.options.renderMode === "svg") {
        continue
      }

      const query = "?url"
      const specifier = normalizeImportPath(record.icon.absolutePath) + query
      statements.push(createDefaultImport(specifier, record.importName))
    }

    return statements
  }

  private buildRegistrationStatements(): ts.Statement[] {
    return []
  }
}

export function transformCompileTimeIcons(code: string, id: string, context: TransformContext): string | null {
  if (!looksLikeCompileTimeIconFile(code, id)) {
    return null
  }

  const sourceFile = ts.createSourceFile(id, code, ts.ScriptTarget.Latest, true, getScriptKind(id))
  const bindings = findCompileBindings(sourceFile)
  const state = new TransformState(sourceFile, context)

  const transformer: ts.TransformerFactory<ts.SourceFile> = (transformationContext) => {
    const visit = (node: ts.Node): ts.VisitResult<ts.Node> => {
      if (ts.isJsxSelfClosingElement(node) || ts.isJsxElement(node)) {
        const tagName = getJsxTagName(node)
        const activeBinding = bindings.component

        if (activeBinding && tagName === activeBinding) {
          return transformJsxIcon(node, state)
        }

        if (tagName === "effective-icon") {
          throw state.errorAt(
            node,
            'Direct <effective-icon> authoring is no longer supported by @effective/icon'
          )
        }

        if (!activeBinding && tagName === "Icon") {
          throw state.errorAt(node, `Import { Icon } from "${COMPILE_MODULE_ID}" before using compile-time icons`)
        }
      }

      return ts.visitEachChild(node, visit, transformationContext)
    }

    return (file) => {
      const transformed = ts.visitEachChild(file, visit, transformationContext)
      if (!state.hasTransformations) {
        return transformed
      }

      return ts.factory.updateSourceFile(transformed, state.buildStatements(transformed.statements))
    }
  }

  const result = ts.transform(sourceFile, [transformer])
  const transformed = result.transformed[0]
  result.dispose()

  if (!state.hasTransformations) {
    return null
  }

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
  return printer.printFile(transformed)
}

function transformJsxIcon(
  node: ts.JsxSelfClosingElement | ts.JsxElement,
  state: TransformState
): ts.JsxSelfClosingElement | ts.JsxElement {
  if (ts.isJsxElement(node)) {
    throw state.errorAt(node, "Compile-time <Icon> does not support children")
  }

  const attributes = node.attributes.properties
  const nameAttribute = findNameAttribute(attributes)

  if (!nameAttribute || !nameAttribute.initializer || !ts.isStringLiteral(nameAttribute.initializer)) {
    throw state.errorAt(node, 'Compile-time <Icon> requires name="literal"')
  }

  const forwarded: ts.JsxAttributeLike[] = []

  for (const attribute of attributes) {
    if (ts.isJsxSpreadAttribute(attribute)) {
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

  return state.buildElement(nameAttribute.initializer.text, forwarded)
}

function findCompileBindings(sourceFile: ts.SourceFile): CompileBindings {
  const bindings: CompileBindings = {}

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue
    }

    if (statement.moduleSpecifier.text !== COMPILE_MODULE_ID) {
      continue
    }

    const namedBindings = statement.importClause?.namedBindings
    if (!namedBindings || !ts.isNamedImports(namedBindings)) {
      continue
    }

    for (const element of namedBindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text
      const localName = element.name.text

      if (importedName === "Icon") {
        bindings.component = localName
      }
    }
  }

  return bindings
}

function isCompileImport(statement: ts.Statement): boolean {
  return (
    ts.isImportDeclaration(statement) &&
    ts.isStringLiteral(statement.moduleSpecifier) &&
    statement.moduleSpecifier.text === COMPILE_MODULE_ID
  )
}

function isReservedAttribute(name: string): boolean {
  if (name === "src") {
    return true
  }

  return false
}

function looksLikeCompileTimeIconFile(code: string, id: string): boolean {
  const filePath = id.replace(/\?.*$/, "")
  const extension = path.extname(filePath)

  if (![".ts", ".tsx", ".js", ".jsx", ".mdx"].includes(extension)) {
    return false
  }

  return code.includes("Icon") || code.includes("effective-icon") || code.includes(COMPILE_MODULE_ID)
}

function getScriptKind(id: string): ts.ScriptKind {
  const extension = path.extname(id.replace(/\?.*$/, ""))

  switch (extension) {
    case ".tsx":
    case ".mdx":
      return ts.ScriptKind.TSX
    case ".jsx":
      return ts.ScriptKind.JSX
    case ".js":
      return ts.ScriptKind.JS
    default:
      return ts.ScriptKind.TS
  }
}

function normalizeImportPath(filePath: string): string {
  return filePath.split(path.sep).join(path.posix.sep)
}
