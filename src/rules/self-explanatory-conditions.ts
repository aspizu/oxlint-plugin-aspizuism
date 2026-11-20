import type {ESTree, Rule} from "@oxlint/plugins"

export default {
  createOnce(context) {
    function _reportIfInCondition(regex: ESTree.Node) {
      let node = regex
      while (node.type !== "Program") {
        const parent = node.parent
        if (
          (parent.type === "IfStatement" || parent.type === "ConditionalExpression") &&
          parent.test === node
        ) {
          context.report({
            node: regex,
            message:
              "Give the result of this regex check an explanatory variable name.",
          })
          return
        }
        node = parent
      }
    }

    return {
      "Literal[regex]"(node: ESTree.RegExpLiteral) {
        _reportIfInCondition(node)
      },
      "CallExpression[callee.name='RegExp'], NewExpression[callee.name='RegExp']"(
        node: ESTree.CallExpression | ESTree.NewExpression,
      ) {
        if (context.sourceCode.isGlobalReference(node.callee)) {
          _reportIfInCondition(node)
        }
      },
    }
  },
} satisfies Rule
