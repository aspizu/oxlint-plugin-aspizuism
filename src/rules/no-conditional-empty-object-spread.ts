import type {ESTree} from "@oxlint/plugins"
import {Rule} from "@oxlint/plugins"

function _unwrapExpression(node: ESTree.Expression): ESTree.Expression {
  while (
    node.type === "ParenthesizedExpression" ||
    node.type === "TSAsExpression" ||
    node.type === "TSSatisfiesExpression" ||
    node.type === "TSTypeAssertion" ||
    node.type === "TSNonNullExpression" ||
    node.type === "TSInstantiationExpression"
  ) {
    node = node.expression
  }
  return node
}

function _isEmptyObject(node: ESTree.Expression): boolean {
  const expression = _unwrapExpression(node)
  return expression.type === "ObjectExpression" && expression.properties.length === 0
}

export default {
  createOnce(context) {
    return {
      SpreadElement(node) {
        if (node.parent.type !== "ObjectExpression") return
        const argument = _unwrapExpression(node.argument)
        if (argument.type !== "ConditionalExpression") return
        if (!_isEmptyObject(argument.consequent) && !_isEmptyObject(argument.alternate))
          return
        context.report({
          node,
          message:
            "This conditional spread hides property omission behind an empty object. Build the object in separate statements and add the property only when present.",
        })
      },
    }
  },
} satisfies Rule
