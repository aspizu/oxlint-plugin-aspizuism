import type {ESTree, Scope, SourceCode, Variable} from "@oxlint/plugins"
import {Rule} from "@oxlint/plugins"

function _getConstantInitializer(variable: Variable | undefined) {
  if (variable?.defs.length !== 1) {
    return null
  }
  const definition = variable.defs[0]
  if (
    definition.node.type !== "VariableDeclarator" ||
    definition.node.id.type !== "Identifier" ||
    definition.parent?.type !== "VariableDeclaration" ||
    definition.parent.kind !== "const" ||
    definition.node.init === null ||
    variable.references.some((reference) => reference.isWrite() && !reference.init)
  ) {
    return null
  }
  return definition.node.init
}

function _resolveKey(node: ESTree.Node, sourceCode: SourceCode): ESTree.Node | null {
  const seen = new Set<ESTree.Node>()
  while (!seen.has(node)) {
    seen.add(node)
    if (
      node.type === "TSAsExpression" ||
      node.type === "TSSatisfiesExpression" ||
      node.type === "TSTypeAssertion" ||
      node.type === "TSNonNullExpression" ||
      node.type === "ParenthesizedExpression"
    ) {
      node = node.expression
      continue
    }
    if (node.type !== "Identifier") break
    let scope: Scope | null = sourceCode.getScope(node)
    while (scope && !scope.set.has(node.name)) scope = scope.upper
    const initializer = _getConstantInitializer(scope?.set.get(node.name))
    if (initializer === null) {
      return null
    }
    node = initializer
  }
  return node
}

function _getMemberName(key: ESTree.Node, computed: boolean, sourceCode: SourceCode) {
  const resolved = computed ? _resolveKey(key, sourceCode) : key
  if (resolved === null) {
    return null
  }
  if (!computed && resolved.type === "Identifier") {
    return resolved.name
  }
  if (resolved.type === "Literal" && typeof resolved.value === "string") {
    return resolved.value
  }
  if (resolved.type === "TemplateLiteral" && resolved.expressions.length === 0) {
    return resolved.quasis[0].value.cooked
  }
  return null
}

export default {
  createOnce(context) {
    return {
      FunctionDeclaration(node) {
        if (node.id === null) return
        const id = node.id
        const variable = context.sourceCode
          .getDeclaredVariables(node)
          .find((candidate) => candidate.identifiers.includes(id))
        const isExported =
          node.parent.type === "ExportNamedDeclaration" ||
          node.parent.type === "ExportDefaultDeclaration" ||
          variable?.references.some((reference) => {
            let parent = reference.identifier.parent
            while (
              parent.type === "TSAsExpression" ||
              parent.type === "TSSatisfiesExpression" ||
              parent.type === "TSTypeAssertion" ||
              parent.type === "TSNonNullExpression" ||
              parent.type === "ParenthesizedExpression"
            ) {
              parent = parent.parent
            }
            return (
              (parent.type === "ExportSpecifier" &&
                parent.exportKind !== "type" &&
                parent.parent.type === "ExportNamedDeclaration" &&
                parent.parent.exportKind !== "type" &&
                parent.parent.source === null) ||
              parent.type === "ExportDefaultDeclaration" ||
              parent.type === "TSExportAssignment"
            )
          })
        if (isExported) {
          if (!node.id.name.startsWith("_")) return
          context.report({
            node: node.id,
            message: "Exported function should not start with an underscore.",
          })
          return
        }
        if (node.id.name.startsWith("_")) return
        if (/^[A-Z]/.test(node.id.name)) return
        context.report({
          node: node.id,
          message: "Private function should start with an underscore.",
        })
      },
      "MethodDefinition, TSAbstractMethodDefinition, PropertyDefinition, TSAbstractPropertyDefinition, AccessorProperty, TSAbstractAccessorProperty, TSParameterProperty"(
        node:
          | ESTree.MethodDefinition
          | ESTree.PropertyDefinition
          | ESTree.AccessorProperty
          | ESTree.TSParameterProperty,
      ) {
        if ("kind" in node && node.kind === "constructor") return
        if (node.accessibility === "protected") return
        let key: ESTree.Node
        if (node.type === "TSParameterProperty") {
          key = node.parameter
          if (key.type === "AssignmentPattern") {
            key = key.left
          }
        } else {
          key = node.key
        }
        const computed = "computed" in node && node.computed
        const name = _getMemberName(key, computed, context.sourceCode)
        if (name == null) return
        const privateMember = node.accessibility === "private"
        if (name.startsWith("_") === privateMember) return
        context.report({
          node: key,
          message:
            (privateMember ? "Private" : "Public") +
            ("kind" in node ? " method" : " property") +
            (privateMember
              ? " should start with an underscore."
              : " should not start with an underscore."),
        })
      },
    }
  },
} satisfies Rule
