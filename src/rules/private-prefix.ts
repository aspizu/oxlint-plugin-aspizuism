import type {Definition, ESTree, Scope, Variable} from "@oxlint/plugins"
import {Rule} from "@oxlint/plugins"

export default {
  createOnce(context) {
    return {
      FunctionDeclaration(node) {
        if (node.id === null) return
        const id = node.id
        const variable = context.sourceCode
          .getDeclaredVariables(node)
          .find((variable) => variable.identifiers.includes(id))
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
        const key =
          node.type === "TSParameterProperty" ?
            node.parameter.type === "AssignmentPattern" ?
              node.parameter.left
            : node.parameter
          : node.key
        let resolved: ESTree.Node = key
        const computed = "computed" in node && node.computed
        if (computed) {
          const seen = new Set<ESTree.Node>()
          while (!seen.has(resolved)) {
            seen.add(resolved)
            if (
              resolved.type === "TSAsExpression" ||
              resolved.type === "TSSatisfiesExpression" ||
              resolved.type === "TSTypeAssertion" ||
              resolved.type === "TSNonNullExpression" ||
              resolved.type === "ParenthesizedExpression"
            ) {
              resolved = resolved.expression
              continue
            }
            if (resolved.type !== "Identifier") break
            let scope: Scope | null = context.sourceCode.getScope(resolved)
            while (scope && !scope.set.has(resolved.name)) scope = scope.upper
            const variable: Variable | undefined = scope?.set.get(resolved.name)
            if (variable?.defs.length !== 1) return
            const definition: Definition = variable.defs[0]
            if (
              definition.node.type !== "VariableDeclarator" ||
              definition.node.id.type !== "Identifier" ||
              definition.parent?.type !== "VariableDeclaration" ||
              definition.parent.kind !== "const" ||
              definition.node.init === null ||
              variable.references.some(
                (reference) => reference.isWrite() && !reference.init,
              )
            ) return
            resolved = definition.node.init
          }
        }
        const name =
          !computed && resolved.type === "Identifier" ? resolved.name
          : resolved.type === "Literal" && typeof resolved.value === "string" ?
            resolved.value
          : resolved.type === "TemplateLiteral" && resolved.expressions.length === 0 ?
            resolved.quasis[0].value.cooked
          : null
        if (name == null) return
        const privateMember = node.accessibility === "private"
        if (name.startsWith("_") === privateMember) return
        context.report({
          node: key,
          message:
            (privateMember ? "Private" : "Public") +
            ("kind" in node ? " method" : " property") +
            (privateMember ?
              " should start with an underscore."
            : " should not start with an underscore."),
        })
      },
    }
  },
} satisfies Rule
