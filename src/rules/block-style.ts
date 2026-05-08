import type {ESTree} from "@oxlint/plugins"
import {Rule} from "@oxlint/plugins"

function _allowsNoBlock(node: ESTree.Statement): boolean {
  switch (node.type) {
    case "ReturnStatement":
      return node.argument === null

    case "BreakStatement":
    case "ContinueStatement":
      return true

    default:
      return false
  }
}

export default {
  createOnce(context) {
    function _checkBranch(branch: ESTree.Statement) {
      if (branch.type === "BlockStatement") {
        if (branch.body.length !== 1) return

        const statement = branch.body[0]

        if (_allowsNoBlock(statement)) {
          context.report({
            node: branch,
            message: "If statement body should not be wrapped in braces.",
          })
        }

        return
      }

      if (!_allowsNoBlock(branch)) {
        context.report({
          node: branch,
          message: "If statement body should be wrapped in braces.",
        })
      }
    }

    return {
      IfStatement(node) {
        _checkBranch(node.consequent)

        if (node.alternate && node.alternate.type !== "IfStatement") {
          _checkBranch(node.alternate)
        }
      },
    }
  },
} satisfies Rule
