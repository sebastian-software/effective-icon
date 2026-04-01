import path from "node:path"

import ts from "typescript"

import type { ResolvedIconPackage, ResolvedPackIcon } from "./resolve-package"
import type { StreamlineIconsOptions } from "./types"

export const COMPILE_MODULE_ID = "vite-plugin-streamline/compile"
export const RUNTIME_MODULE_ID = "vite-plugin-streamline/runtime"

interface TransformContext {
  options: Required<Pick<StreamlineIconsOptions, "target" | "renderMode">> & { package: string }
  resolvedPackage: ResolvedIconPackage
}

interface CompileBindings {
  component?: string
  tag?: string
}

interface IconImportRecord {
  icon: ResolvedPackIcon
  importName: string
  definitionId: string
}

class TransformState {
  private iconImports = new Map<string, IconImportRecord>()
  private importCounter = 0
  private needsMaskRuntime = false
  private needsWebComponentRuntime = false

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
      importName: `__streamlineIconAsset${this.importCounter++}`,
      definitionId: `${this.context.options.package}:${iconName}`,
    }

    if (this.context.options.target === "jsx" && this.context.options.renderMode === "mask") {
      this.needsMaskRuntime = true
    }

    if (this.context.options.target === "web-component") {
      this.needsWebComponentRuntime = true
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

    return [...leadingImports, ...retainedStatements, ...registrationStatements]
  }

  buildElement(iconName: string, attributes: ts.JsxAttributeLike[]): ts.JsxSelfClosingElement {
    const record = this.ensureIcon(iconName)

    if (this.context.options.target === "web-component") {
      return createJsxElement(
        "streamline-icon",
        [...attributes, createStringAttribute("data-streamline-id", record.definitionId), ...createA11yFallback(attributes)]
      )
    }

    if (this.context.options.renderMode === "mask") {
      const forwarded = attributes.filter((attribute) => getJsxAttributeName(attribute) !== "style")
      const styleExpression = getJsxAttributeExpression(attributes, "style") ?? ts.factory.createIdentifier("undefined")

      return createJsxElement("span", [
        ...forwarded,
        createExpressionAttribute(
          "style",
          ts.factory.createCallExpression(ts.factory.createIdentifier("__streamlineBuildMaskStyle"), undefined, [
            ts.factory.createIdentifier(record.importName),
            styleExpression,
          ])
        ),
        ...createA11yFallback(forwarded),
      ])
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

    if (this.needsMaskRuntime) {
      statements.push(
        createNamedImport(
          RUNTIME_MODULE_ID,
          [["buildStreamlineMaskStyle", "__streamlineBuildMaskStyle"]]
        )
      )
    }

    if (this.needsWebComponentRuntime) {
      statements.push(
        createNamedImport(RUNTIME_MODULE_ID, [
          ["ensureStreamlineIconElement", "__streamlineEnsureIconElement"],
          ["registerStreamlineIconDefinition", "__streamlineRegisterIconDefinition"],
        ])
      )
    }

    for (const record of this.iconImports.values()) {
      const query = this.context.options.target === "web-component" ? "?raw" : "?url"
      const specifier = normalizeImportPath(record.icon.absolutePath) + query
      statements.push(createDefaultImport(specifier, record.importName))
    }

    return statements
  }

  private buildRegistrationStatements(): ts.Statement[] {
    if (!this.needsWebComponentRuntime) {
      return []
    }

    const statements: ts.Statement[] = [
      ts.factory.createExpressionStatement(
        ts.factory.createCallExpression(ts.factory.createIdentifier("__streamlineEnsureIconElement"), undefined, [])
      ),
    ]

    for (const record of this.iconImports.values()) {
      statements.push(
        ts.factory.createExpressionStatement(
          ts.factory.createCallExpression(
            ts.factory.createIdentifier("__streamlineRegisterIconDefinition"),
            undefined,
            [ts.factory.createStringLiteral(record.definitionId), ts.factory.createIdentifier(record.importName)]
          )
        )
      )
    }

    return statements
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

        if (!activeBinding && tagName === "Icon") {
          throw state.errorAt(node, `Import { Icon } from "${COMPILE_MODULE_ID}" before using compile-time icons`)
        }
      }

      if (ts.isTaggedTemplateExpression(node)) {
        if (bindings.tag && ts.isIdentifier(node.tag) && node.tag.text === bindings.tag) {
          return transformTaggedIcon(node, state)
        }

        if (!bindings.tag && ts.isIdentifier(node.tag) && node.tag.text === "icon") {
          throw state.errorAt(node, `Import { icon } from "${COMPILE_MODULE_ID}" before using compile-time icons`)
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

function transformJsxIcon(node: ts.JsxSelfClosingElement | ts.JsxElement, state: TransformState): ts.JsxSelfClosingElement {
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

    if (isReservedAttribute(attributeName, state)) {
      throw state.errorAt(attribute, `Prop "${attributeName}" is reserved by vite-plugin-streamline`)
    }

    forwarded.push(attribute)
  }

  return state.buildElement(nameAttribute.initializer.text, forwarded)
}

function transformTaggedIcon(node: ts.TaggedTemplateExpression, state: TransformState): ts.JsxSelfClosingElement {
  const fileExtension = path.extname(node.getSourceFile().fileName.replace(/\?.*$/, ""))
  if (![".tsx", ".jsx", ".mdx"].includes(fileExtension)) {
    throw state.errorAt(node, "Compile-time icon templates are only supported in JSX, TSX, or MDX files")
  }

  if (!ts.isNoSubstitutionTemplateLiteral(node.template)) {
    throw state.errorAt(node, "Compile-time icon templates do not support interpolation")
  }

  return state.buildElement(node.template.text, [])
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

      if (importedName === "icon") {
        bindings.tag = localName
      }
    }
  }

  return bindings
}

function findNameAttribute(attributes: readonly ts.JsxAttributeLike[]): ts.JsxAttribute | undefined {
  return attributes.find(
    (attribute): attribute is ts.JsxAttribute =>
      ts.isJsxAttribute(attribute) && getJsxAttributeIdentifier(attribute.name) === "name"
  )
}

function getJsxTagName(node: ts.JsxSelfClosingElement | ts.JsxElement): string {
  const tagName = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName
  return ts.isIdentifier(tagName) ? tagName.text : tagName.getText()
}

function getJsxAttributeName(attribute: ts.JsxAttributeLike): string | null {
  if (!ts.isJsxAttribute(attribute)) {
    return null
  }

  return getJsxAttributeIdentifier(attribute.name)
}

function getJsxAttributeExpression(
  attributes: readonly ts.JsxAttributeLike[],
  name: string
): ts.Expression | undefined {
  const attribute = attributes.find(
    (candidate): candidate is ts.JsxAttribute =>
      ts.isJsxAttribute(candidate) && getJsxAttributeIdentifier(candidate.name) === name
  )

  if (!attribute?.initializer) {
    return undefined
  }

  if (ts.isStringLiteral(attribute.initializer)) {
    return ts.factory.createStringLiteral(attribute.initializer.text)
  }

  if (ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression) {
    return attribute.initializer.expression
  }

  return undefined
}

function createJsxElement(tagName: string, attributes: ts.JsxAttributeLike[]): ts.JsxSelfClosingElement {
  return ts.factory.createJsxSelfClosingElement(
    ts.factory.createIdentifier(tagName),
    undefined,
    ts.factory.createJsxAttributes(attributes)
  )
}

function createStringAttribute(name: string, value: string): ts.JsxAttribute {
  return ts.factory.createJsxAttribute(ts.factory.createIdentifier(name), ts.factory.createStringLiteral(value))
}

function createExpressionAttribute(name: string, expression: ts.Expression): ts.JsxAttribute {
  return ts.factory.createJsxAttribute(
    ts.factory.createIdentifier(name),
    ts.factory.createJsxExpression(undefined, expression)
  )
}

function createA11yFallback(attributes: readonly ts.JsxAttributeLike[]): ts.JsxAttribute[] {
  const names = new Set(attributes.map((attribute) => getJsxAttributeName(attribute)).filter(Boolean))
  if (names.has("aria-hidden") || names.has("aria-label") || names.has("aria-labelledby") || names.has("role")) {
    return []
  }

  return [createStringAttribute("aria-hidden", "true")]
}

function createImageFallback(attributes: readonly ts.JsxAttributeLike[]): ts.JsxAttribute[] {
  const names = new Set(attributes.map((attribute) => getJsxAttributeName(attribute)).filter(Boolean))
  const fallback: ts.JsxAttribute[] = []

  if (!names.has("alt")) {
    fallback.push(createStringAttribute("alt", ""))
  }

  return [...fallback, ...createA11yFallback(attributes)]
}

function createDefaultImport(specifier: string, localName: string): ts.ImportDeclaration {
  return ts.factory.createImportDeclaration(
    undefined,
    ts.factory.createImportClause(false, ts.factory.createIdentifier(localName), undefined),
    ts.factory.createStringLiteral(specifier),
    undefined
  )
}

function createNamedImport(moduleId: string, bindings: Array<[string, string]>): ts.ImportDeclaration {
  return ts.factory.createImportDeclaration(
    undefined,
    ts.factory.createImportClause(
      false,
      undefined,
      ts.factory.createNamedImports(
        bindings.map(([importedName, localName]) =>
          ts.factory.createImportSpecifier(
            false,
            importedName === localName ? undefined : ts.factory.createIdentifier(importedName),
            ts.factory.createIdentifier(localName)
          )
        )
      )
    ),
    ts.factory.createStringLiteral(moduleId),
    undefined
  )
}

function getJsxAttributeIdentifier(name: ts.JsxAttributeName): string {
  return ts.isIdentifier(name) ? name.text : name.getText()
}

function isCompileImport(statement: ts.Statement): boolean {
  return (
    ts.isImportDeclaration(statement) &&
    ts.isStringLiteral(statement.moduleSpecifier) &&
    statement.moduleSpecifier.text === COMPILE_MODULE_ID
  )
}

function isReservedAttribute(name: string, state: TransformState): boolean {
  if (name === "src") {
    return true
  }

  if (name === "data-streamline-id") {
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

  return code.includes("Icon") || code.includes("icon`") || code.includes(COMPILE_MODULE_ID)
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
