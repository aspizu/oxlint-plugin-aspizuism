import {Rule} from "@oxlint/plugins"

export default {
  createOnce(context) {
    return {
      VariableDeclaration(node) {
        if (node.kind !== "const") return
        if (node.declarations.length !== 1) return
        if (node.declarations[0].init === null) return
        if (node.declarations[0].init.type !== "ArrowFunctionExpression") return
        if (node.declarations[0].id.typeAnnotation !== null) return
        context.report({
          node: node.declarations[0].id,
          message: "Arrow function should be declared as a function.",
        })
      },
    }
  },
} satisfies Rule
