import {Rule} from "@oxlint/plugins"

export default {
  createOnce(context) {
    return {
      Program(node) {
        for (const comment of node.comments) {
          const trimmed = comment.value.trim()
          if (comment.type !== "Line" && comment.type !== "Block") continue
          if (
            (comment.type === "Block" && trimmed.startsWith("*")) ||
            trimmed.startsWith("@ts-") ||
            trimmed.startsWith("eslint-") ||
            trimmed.startsWith("oxlint-") ||
            trimmed.startsWith("prettier-ignore") ||
            trimmed.startsWith("#region") ||
            trimmed.startsWith("#endregion") ||
            trimmed.toLowerCase().startsWith("todo") ||
            trimmed.toLowerCase().startsWith("fixme")
          ) continue
          context.report({
            node: comment,
            message: "Comments are not allowed.",
          })
        }
      },
    }
  },
} satisfies Rule
