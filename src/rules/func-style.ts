import type {ESTree, SourceCode} from "@oxlint/plugins"
import {Rule} from "@oxlint/plugins"

function _isNode(value: unknown): value is ESTree.Node {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof value.type === "string"
  )
}

function _queueChildren(
  node: ESTree.Node,
  pending: ESTree.Node[],
  sourceCode: SourceCode,
) {
  for (const key of sourceCode.visitorKeys[node.type] ?? []) {
    if (
      key === "value" &&
      (node.type === "PropertyDefinition" ||
        node.type === "TSAbstractPropertyDefinition" ||
        node.type === "AccessorProperty" ||
        node.type === "TSAbstractAccessorProperty")
    )
      continue
    const value: unknown = Reflect.get(node, key)
    if (Array.isArray(value)) {
      pending.push(...value.filter(_isNode))
    } else if (_isNode(value)) {
      pending.push(value)
    }
  }
}

function _isDirectEval(node: ESTree.Node): boolean {
  if (node.type !== "CallExpression" || node.optional) {
    return false
  }
  let callee = node.callee
  while (
    callee.type === "TSAsExpression" ||
    callee.type === "TSSatisfiesExpression" ||
    callee.type === "TSTypeAssertion" ||
    callee.type === "TSNonNullExpression" ||
    callee.type === "TSInstantiationExpression" ||
    callee.type === "ParenthesizedExpression"
  ) {
    callee = callee.expression
  }
  return callee.type === "Identifier" && callee.name === "eval"
}

function _usesLexicalScope(
  node: ESTree.Node,
  arrow: ESTree.ArrowFunctionExpression,
  sourceCode: SourceCode,
): boolean {
  if (
    node.type === "ThisExpression" ||
    node.type === "Super" ||
    (node.type === "MetaProperty" && node.meta.name === "new")
  ) {
    return true
  }
  if (_isDirectEval(node)) {
    return true
  }
  if (node.type !== "Identifier" || node.name !== "arguments") {
    return false
  }
  const reference = sourceCode
    .getScope(node)
    .references.find((candidate) => candidate.identifier === node)
  if (!reference) {
    return false
  }
  return (
    !reference.resolved?.defs.some(
      (definition) =>
        definition.name.range[0] >= arrow.range[0] &&
        definition.name.range[1] <= arrow.range[1],
    ) ||
    reference.resolved.defs.some(
      (definition) =>
        definition.parent?.type === "VariableDeclaration" &&
        definition.parent.kind === "var",
    )
  )
}

function _queueParameterDecorators(
  node: ESTree.Function,
  pending: ESTree.Node[],
  sourceCode: SourceCode,
): boolean {
  for (const [index, parameter] of node.params.entries()) {
    if (
      parameter.type === "RestElement" &&
      sourceCode
        .getTokens(node)
        .some(
          (token) =>
            token.value === "@" &&
            token.range[0] >= (node.params[index - 1]?.range[1] ?? node.range[0]) &&
            token.range[1] <= parameter.range[0],
        )
    ) {
      return false
    }
    pending.push(...(parameter.decorators ?? []))
  }
  return true
}

export default {
  createOnce(context) {
    return {
      VariableDeclaration(node) {
        if (node.kind !== "const") return
        if (node.declarations.length !== 1) return
        if (node.declarations[0].init === null) return
        if (node.declarations[0].init.type !== "ArrowFunctionExpression") return
        if (node.declarations[0].id.type !== "Identifier") return
        if (node.declarations[0].id.typeAnnotation != null) return
        const arrow = node.declarations[0].init
        const pending: ESTree.Node[] = [arrow]
        while (pending.length !== 0) {
          const child = pending.pop()!
          if (_usesLexicalScope(child, arrow, context.sourceCode)) return
          if (
            child.type === "FunctionDeclaration" ||
            child.type === "FunctionExpression" ||
            child.type === "TSDeclareFunction" ||
            child.type === "TSEmptyBodyFunctionExpression"
          ) {
            if (!_queueParameterDecorators(child, pending, context.sourceCode)) return
            continue
          }
          if (child.type === "StaticBlock") continue
          _queueChildren(child, pending, context.sourceCode)
        }
        context.report({
          node: node.declarations[0].id,
          message: "Arrow function should be declared as a function.",
        })
      },
    }
  },
} satisfies Rule
