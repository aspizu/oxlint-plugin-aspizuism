import type {ESTree} from "@oxlint/plugins"
import {Rule} from "@oxlint/plugins"

function _allowsNoBlock(node: ESTree.Statement): boolean {
  switch (node.type) {
    case "ReturnStatement": {
      return node.argument === null
    }

    case "BreakStatement":
    case "ContinueStatement": {
      return true
    }

    default: {
      return false
    }
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
      SwitchCase(node) {
        if (node.consequent.length === 0) return

        const statement = node.consequent[0]

        if (node.consequent.length === 1 && statement.type === "BlockStatement") {
          if (statement.body.length === 0) {
            context.report({
              node: statement,
              message: "Empty switch case body should not be wrapped in braces.",
            })
          }

          return
        }

        context.report({
          node,
          message: "Switch case body should be wrapped in braces.",
        })
      },
      IfStatement(node) {
        _checkBranch(node.consequent)

        if (node.alternate && node.alternate.type !== "IfStatement") {
          _checkBranch(node.alternate)
        }
      },
    }
  },
} satisfies Rule
