import path from "node:path"
import { readFileSync } from "node:fs"

import ts from "typescript"

import type { ResolvedIconPackage, ResolvedPackIcon } from "./resolve-package"

export const COMPILE_MODULE_ID = "@effective/icon/compile"
export const RUNTIME_MODULE_ID = "@effective/icon/runtime"

interface TransformContext {
  options: { package: string; surface: "jsx" | "custom-element"; renderMode: "image" | "mask" | "svg" }
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
      importName: `__iconAsset${this.importCounter++}`,
      inlineSvg:
        this.context.options.surface === "jsx" && this.context.options.renderMode === "svg"
          ? parseInlineSvg(icon.absolutePath, this.sourceFile.fileName)
          : undefined,
    }

    if (this.context.options.surface === "jsx" && this.context.options.renderMode === "mask") {
      this.needsMaskRuntime = true
    }

    if (this.context.options.surface === "custom-element") {
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

  buildElement(iconName: string, attributes: ts.JsxAttributeLike[]): ts.JsxSelfClosingElement | ts.JsxElement {
    const record = this.ensureIcon(iconName)

    if (this.context.options.surface === "custom-element") {
      return createJsxElement(
        "effective-icon",
        [...attributes, createExpressionAttribute("data-icon-url", ts.factory.createIdentifier(record.importName)), ...createA11yFallback(attributes)]
      )
    }

    if (this.context.options.renderMode === "mask") {
      const forwarded = attributes.filter((attribute) => getJsxAttributeName(attribute) !== "style")
      const styleExpression = getJsxAttributeExpression(attributes, "style") ?? ts.factory.createIdentifier("undefined")

      return createJsxElement("span", [
        ...forwarded,
        createExpressionAttribute(
          "style",
          ts.factory.createCallExpression(ts.factory.createIdentifier("__iconBuildMaskStyle"), undefined, [
            ts.factory.createIdentifier(record.importName),
            styleExpression,
          ])
        ),
        ...createA11yFallback(forwarded),
      ])
    }

    if (this.context.options.renderMode === "svg") {
      return createInlineSvgElement(record, [...attributes, ...createA11yFallback(attributes)])
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
          [["buildIconMaskStyle", "__iconBuildMaskStyle"]]
        )
      )
    }

    if (this.needsWebComponentRuntime) {
      statements.push(
        createNamedImport(RUNTIME_MODULE_ID, [["ensureIconElement", "__iconEnsureElement"]])
      )
    }

    for (const record of this.iconImports.values()) {
      if (this.context.options.surface === "jsx" && this.context.options.renderMode === "svg") {
        continue
      }

      const query = "?url"
      const specifier = normalizeImportPath(record.icon.absolutePath) + query
      statements.push(createDefaultImport(specifier, record.importName))
    }

    return statements
  }

  private buildRegistrationStatements(): ts.Statement[] {
    if (!this.needsWebComponentRuntime) {
      return []
    }

    return [
      ts.factory.createExpressionStatement(
        ts.factory.createCallExpression(ts.factory.createIdentifier("__iconEnsureElement"), undefined, [])
      ),
    ]
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

        if (context.options.surface === "jsx") {
          if (activeBinding && tagName === activeBinding) {
            return transformJsxIcon(node, state, "Icon")
          }

          if (tagName === "effective-icon") {
            throw state.errorAt(
              node,
              'Direct <effective-icon> authoring is only supported when surface is "custom-element"'
            )
          }

          if (!activeBinding && tagName === "Icon") {
            throw state.errorAt(node, `Import { Icon } from "${COMPILE_MODULE_ID}" before using compile-time icons`)
          }

          return ts.visitEachChild(node, visit, transformationContext)
        }

        if (tagName === "effective-icon") {
          return transformJsxIcon(node, state, "effective-icon")
        }

        if ((activeBinding && tagName === activeBinding) || tagName === "Icon") {
          throw state.errorAt(node, 'Compile-time <Icon> is only supported when surface is "jsx"')
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
  state: TransformState,
  surfaceName: "Icon" | "effective-icon"
): ts.JsxSelfClosingElement | ts.JsxElement {
  if (ts.isJsxElement(node)) {
    throw state.errorAt(node, `Compile-time <${surfaceName}> does not support children`)
  }

  const attributes = node.attributes.properties
  const nameAttribute = findNameAttribute(attributes)

  if (!nameAttribute || !nameAttribute.initializer || !ts.isStringLiteral(nameAttribute.initializer)) {
    throw state.errorAt(node, `Compile-time <${surfaceName}> requires name="literal"`)
  }

  const forwarded: ts.JsxAttributeLike[] = []

  for (const attribute of attributes) {
    if (ts.isJsxSpreadAttribute(attribute)) {
      throw state.errorAt(attribute, `Compile-time <${surfaceName}> does not support spread props`)
    }

    const attributeName = getJsxAttributeIdentifier(attribute.name)
    if (attributeName === "name") {
      continue
    }

    if (isReservedAttribute(attributeName, state)) {
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

function createInlineSvgElement(
  record: IconImportRecord,
  attributes: readonly ts.JsxAttributeLike[]
): ts.JsxElement | ts.JsxSelfClosingElement {
  if (!record.inlineSvg) {
    throw new Error(`Missing inline SVG AST for "${record.icon.name}"`)
  }

  const clonedSvg = cloneStaticJsxNode(record.inlineSvg)

  if (ts.isJsxElement(clonedSvg)) {
    return ts.factory.updateJsxElement(
      clonedSvg,
      ts.factory.updateJsxOpeningElement(
        clonedSvg.openingElement,
        clonedSvg.openingElement.tagName,
        clonedSvg.openingElement.typeArguments,
        ts.factory.createJsxAttributes(mergeJsxAttributes(clonedSvg.openingElement.attributes.properties, attributes))
      ),
      clonedSvg.children,
      clonedSvg.closingElement
    )
  }

  return ts.factory.updateJsxSelfClosingElement(
    clonedSvg,
    clonedSvg.tagName,
    clonedSvg.typeArguments,
    ts.factory.createJsxAttributes(mergeJsxAttributes(clonedSvg.attributes.properties, attributes))
  )
}

function mergeJsxAttributes(
  existing: readonly ts.JsxAttributeLike[],
  forwarded: readonly ts.JsxAttributeLike[]
): ts.JsxAttributeLike[] {
  const merged: ts.JsxAttributeLike[] = []
  const indexByName = new Map<string, number>()

  for (const attribute of [...existing, ...forwarded]) {
    const name = getJsxAttributeName(attribute)

    if (!name) {
      merged.push(attribute)
      continue
    }

    const existingIndex = indexByName.get(name)
    if (existingIndex == null) {
      indexByName.set(name, merged.length)
      merged.push(attribute)
      continue
    }

    merged[existingIndex] = attribute
  }

  return merged
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

function parseInlineSvg(iconPath: string, fromFile: string): ts.JsxElement | ts.JsxSelfClosingElement {
  const rawSvg = readFileSync(iconPath, "utf8").trim()
  const source = ts.createSourceFile(
    `${iconPath}.tsx`,
    `const __streamlineInlineIcon = (${rawSvg});`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  const statement = source.statements[0]

  if (!statement || !ts.isVariableStatement(statement)) {
    throw new Error(`Could not parse inline SVG for "${iconPath}" referenced from "${fromFile}"`)
  }

  const initializer = statement.declarationList.declarations[0]?.initializer
  const expression = initializer && ts.isParenthesizedExpression(initializer) ? initializer.expression : initializer

  if (!expression || (!ts.isJsxElement(expression) && !ts.isJsxSelfClosingElement(expression))) {
    throw new Error(`Expected root <svg> element in "${iconPath}" referenced from "${fromFile}"`)
  }

  const tagName = ts.isJsxElement(expression) ? expression.openingElement.tagName : expression.tagName
  if (!ts.isIdentifier(tagName) || tagName.text !== "svg") {
    throw new Error(`Expected root <svg> element in "${iconPath}" referenced from "${fromFile}"`)
  }

  return cloneStaticJsxNode(expression)
}

function cloneStaticJsxNode(node: ts.JsxElement | ts.JsxSelfClosingElement): ts.JsxElement | ts.JsxSelfClosingElement {
  if (ts.isJsxElement(node)) {
    return ts.factory.createJsxElement(
      ts.factory.createJsxOpeningElement(
        cloneJsxTagName(node.openingElement.tagName),
        undefined,
        ts.factory.createJsxAttributes(node.openingElement.attributes.properties.map(cloneJsxAttributeLike))
      ),
      node.children.map(cloneJsxChild),
      ts.factory.createJsxClosingElement(cloneJsxTagName(node.closingElement.tagName))
    )
  }

  return ts.factory.createJsxSelfClosingElement(
    cloneJsxTagName(node.tagName),
    undefined,
    ts.factory.createJsxAttributes(node.attributes.properties.map(cloneJsxAttributeLike))
  )
}

function cloneJsxChild(child: ts.JsxChild): ts.JsxChild {
  if (ts.isJsxText(child)) {
    return ts.factory.createJsxText(child.getText())
  }

  if (ts.isJsxElement(child)) {
    return cloneStaticJsxNode(child)
  }

  if (ts.isJsxSelfClosingElement(child)) {
    return cloneStaticJsxNode(child)
  }

  if (ts.isJsxExpression(child)) {
    return ts.factory.createJsxExpression(undefined, child.expression)
  }

  if (ts.isJsxFragment(child)) {
    return ts.factory.createJsxFragment(
      ts.factory.createJsxOpeningFragment(),
      child.children.map(cloneJsxChild),
      ts.factory.createJsxJsxClosingFragment()
    )
  }

  return child
}

function cloneJsxAttributeLike(attribute: ts.JsxAttributeLike): ts.JsxAttributeLike {
  if (ts.isJsxSpreadAttribute(attribute)) {
    return ts.factory.createJsxSpreadAttribute(attribute.expression)
  }

  return ts.factory.createJsxAttribute(
    cloneJsxAttributeName(attribute.name),
    cloneJsxAttributeInitializer(attribute.initializer)
  )
}

function cloneJsxAttributeInitializer(
  initializer: ts.JsxAttribute["initializer"]
): ts.StringLiteral | ts.JsxExpression | ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment | undefined {
  if (!initializer) {
    return undefined
  }

  if (ts.isStringLiteral(initializer)) {
    return ts.factory.createStringLiteral(initializer.text)
  }

  if (ts.isJsxExpression(initializer)) {
    return ts.factory.createJsxExpression(undefined, initializer.expression)
  }

  if (ts.isJsxElement(initializer) || ts.isJsxSelfClosingElement(initializer)) {
    return cloneStaticJsxNode(initializer)
  }

  return ts.factory.createJsxFragment(
    ts.factory.createJsxOpeningFragment(),
    initializer.children.map(cloneJsxChild),
    ts.factory.createJsxJsxClosingFragment()
  )
}

function cloneJsxAttributeName(name: ts.JsxAttributeName): ts.JsxAttributeName {
  if (ts.isIdentifier(name)) {
    return ts.factory.createIdentifier(name.text)
  }

  return ts.factory.createJsxNamespacedName(
    ts.factory.createIdentifier(name.namespace.text),
    ts.factory.createIdentifier(name.name.text)
  )
}

function cloneJsxTagName(name: ts.JsxTagNameExpression): ts.JsxTagNameExpression {
  if (ts.isIdentifier(name)) {
    return ts.factory.createIdentifier(name.text)
  }

  if (ts.isJsxNamespacedName(name)) {
    return ts.factory.createJsxNamespacedName(
      ts.factory.createIdentifier(name.namespace.text),
      ts.factory.createIdentifier(name.name.text)
    )
  }

  if (ts.isPropertyAccessExpression(name)) {
    return ts.factory.createPropertyAccessExpression(
      cloneJsxTagName(name.expression) as ts.Identifier | ts.ThisExpression | ts.JsxTagNamePropertyAccess,
      ts.factory.createIdentifier(name.name.text)
    ) as unknown as ts.JsxTagNamePropertyAccess
  }

  return ts.factory.createThis()
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

  if (name === "data-icon-id" || name === "data-icon-url") {
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
