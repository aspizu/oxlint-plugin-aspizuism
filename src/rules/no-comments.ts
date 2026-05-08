import {Rule} from "@oxlint/plugins"

export default {
  createOnce(context) {
    return {
      Program(node) {
        for (const comment of node.comments) {
          const trimmed = comment.value.trim()
          switch (comment.type) {
            case "Line": {
              if (
                !(
                  trimmed.startsWith("@ts-") ||
                  trimmed.startsWith("eslint-") ||
                  trimmed.startsWith("oxlint-") ||
                  trimmed.startsWith("#region") ||
                  trimmed.startsWith("#endregion") ||
                  trimmed.toLocaleLowerCase().startsWith("todo") ||
                  trimmed.toLocaleLowerCase().startsWith("fixme")
                )
              ) {
                context.report({
                  node: comment,
                  message: "Comments are not allowed.",
                })
              }
              break
            }
            case "Block": {
              if (!comment.value.startsWith("*")) {
                context.report({
                  node: comment,
                  message: "Comments are not allowed.",
                })
              }
              break
            }
          }
        }
      },
    }
  },
} satisfies Rule
