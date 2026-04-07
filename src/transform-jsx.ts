import ts from "typescript"

export function findNameAttribute(attributes: readonly ts.JsxAttributeLike[]): ts.JsxAttribute | undefined {
  return attributes.find(
    (attribute): attribute is ts.JsxAttribute =>
      ts.isJsxAttribute(attribute) && getJsxAttributeIdentifier(attribute.name) === "name"
  )
}

export function getJsxTagName(node: ts.JsxSelfClosingElement | ts.JsxElement): string {
  const tagName = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName
  return ts.isIdentifier(tagName) ? tagName.text : tagName.getText()
}

export function getJsxAttributeName(attribute: ts.JsxAttributeLike): string | null {
  if (!ts.isJsxAttribute(attribute)) {
    return null
  }

  return getJsxAttributeIdentifier(attribute.name)
}

export function getJsxAttributeExpression(
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

export function mergeJsxAttributes(
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

export function createJsxElement(tagName: string, attributes: ts.JsxAttributeLike[]): ts.JsxSelfClosingElement {
  return ts.factory.createJsxSelfClosingElement(
    ts.factory.createIdentifier(tagName),
    undefined,
    ts.factory.createJsxAttributes(attributes)
  )
}

export function createStringAttribute(name: string, value: string): ts.JsxAttribute {
  return ts.factory.createJsxAttribute(ts.factory.createIdentifier(name), ts.factory.createStringLiteral(value))
}

export function createExpressionAttribute(name: string, expression: ts.Expression): ts.JsxAttribute {
  return ts.factory.createJsxAttribute(
    ts.factory.createIdentifier(name),
    ts.factory.createJsxExpression(undefined, expression)
  )
}

export function appendClassName(attribute: ts.JsxAttribute, className: string): ts.JsxAttribute {
  if (!attribute.initializer) {
    return createStringAttribute(getJsxAttributeIdentifier(attribute.name), className)
  }

  if (ts.isStringLiteral(attribute.initializer)) {
    return createStringAttribute(getJsxAttributeIdentifier(attribute.name), `${attribute.initializer.text} ${className}`)
  }

  if (ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression) {
    return createExpressionAttribute(
      getJsxAttributeIdentifier(attribute.name),
      createJoinedClassNameExpression(attribute.initializer.expression, className)
    )
  }

  return attribute
}

export function styleTargetToClassPropName(styleTarget: "object" | "string"): "class" | "className" {
  return styleTarget === "string" ? "class" : "className"
}

export function createA11yFallback(attributes: readonly ts.JsxAttributeLike[]): ts.JsxAttribute[] {
  const names = new Set(attributes.map((attribute) => getJsxAttributeName(attribute)).filter(Boolean))
  if (names.has("aria-hidden") || names.has("aria-label") || names.has("aria-labelledby") || names.has("role")) {
    return []
  }

  return [createStringAttribute("aria-hidden", "true")]
}

export function createImageFallback(attributes: readonly ts.JsxAttributeLike[]): ts.JsxAttribute[] {
  const names = new Set(attributes.map((attribute) => getJsxAttributeName(attribute)).filter(Boolean))
  const fallback: ts.JsxAttribute[] = []

  if (!names.has("alt")) {
    fallback.push(createStringAttribute("alt", ""))
  }

  return [...fallback, ...createA11yFallback(attributes)]
}

export function createDefaultImport(specifier: string, localName: string): ts.ImportDeclaration {
  return ts.factory.createImportDeclaration(
    undefined,
    ts.factory.createImportClause(false, ts.factory.createIdentifier(localName), undefined),
    ts.factory.createStringLiteral(specifier),
    undefined
  )
}

export function createNamedImport(moduleId: string, bindings: Array<[string, string]>): ts.ImportDeclaration {
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

export function createSideEffectImport(specifier: string): ts.ImportDeclaration {
  return ts.factory.createImportDeclaration(undefined, undefined, ts.factory.createStringLiteral(specifier), undefined)
}

export function getJsxAttributeIdentifier(name: ts.JsxAttributeName): string {
  if (ts.isIdentifier(name)) {
    return name.text
  }

  return `${name.namespace.text}:${name.name.text}`
}

function createJoinedClassNameExpression(expression: ts.Expression, className: string): ts.Expression {
  return ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          ts.factory.createArrayLiteralExpression([expression, ts.factory.createStringLiteral(className)]),
          "filter"
        ),
        undefined,
        [ts.factory.createIdentifier("Boolean")]
      ),
      "join"
    ),
    undefined,
    [ts.factory.createStringLiteral(" ")]
  )
}
