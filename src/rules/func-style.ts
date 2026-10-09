import type {ESTree} from "@oxlint/plugins"
import {Rule} from "@oxlint/plugins"

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
          if (
            child.type === "ThisExpression" ||
            child.type === "Super" ||
            (child.type === "MetaProperty" && child.meta.name === "new")
          ) return
          if (child.type === "Identifier" && child.name === "arguments") {
            const reference = context.sourceCode
              .getScope(child)
              .references.find((reference) => reference.identifier === child)
            if (
              reference &&
              (!reference.resolved?.defs.some(
                (definition) =>
                  definition.name.range[0] >= arrow.range[0] &&
                  definition.name.range[1] <= arrow.range[1],
              ) ||
                reference.resolved.defs.some(
                  (definition) =>
                    definition.parent?.type === "VariableDeclaration" &&
                    definition.parent.kind === "var",
                ))
            ) return
          }
          if (child.type === "CallExpression" && !child.optional) {
            let callee = child.callee
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
            if (callee.type === "Identifier" && callee.name === "eval") return
          }
          if (
            child.type === "FunctionDeclaration" ||
            child.type === "FunctionExpression" ||
            child.type === "TSDeclareFunction" ||
            child.type === "TSEmptyBodyFunctionExpression"
          ) {
            for (const [index, parameter] of child.params.entries()) {
              if (
                parameter.type === "RestElement" &&
                context.sourceCode.getTokens(child).some(
                  (token) =>
                    token.value === "@" &&
                    token.range[0] >=
                      (child.params[index - 1]?.range[1] ?? child.range[0]) &&
                    token.range[1] <= parameter.range[0],
                )
              ) return
              for (const decorator of parameter.decorators ?? []) {
                pending.push(decorator)
              }
            }
            continue
          }
          if (child.type === "StaticBlock") continue
          for (const key of context.sourceCode.visitorKeys[child.type] ?? []) {
            if (
              key === "value" &&
              (child.type === "PropertyDefinition" ||
                child.type === "TSAbstractPropertyDefinition" ||
                child.type === "AccessorProperty" ||
                child.type === "TSAbstractAccessorProperty")
            ) continue
            const value = (
              child as unknown as Record<
                string,
                ESTree.Node | (ESTree.Node | null)[] | null
              >
            )[key]
            if (Array.isArray(value)) {
              for (const node of value) {
                if (node !== null) {
                  pending.push(node)
                }
              }
            } else if (value != null) {
              pending.push(value)
            }
          }
        }
        context.report({
          node: node.declarations[0].id,
          message: "Arrow function should be declared as a function.",
        })
      },
    }
  },
} satisfies Rule
