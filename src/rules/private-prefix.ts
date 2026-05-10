import {Rule} from "@oxlint/plugins"

export default {
  createOnce(context) {
    return {
      ExportNamedDeclaration(node) {
        if (node.declaration === null) return
        if (node.declaration.type !== "FunctionDeclaration") return
        if (node.declaration.id === null) return
        if (!node.declaration.id.name.startsWith("_")) return
        if (/^[A-Z]/.test(node.declaration.id.name)) return
        context.report({
          node: node.declaration.id,
          message: "Exported function should not start with an underscore.",
        })
      },
      FunctionDeclaration(node) {
        if (node.id === null) return
        if (node.id.name.startsWith("_")) return
        if (/^[A-Z]/.test(node.id.name)) return
        if (node.parent.type === "ExportNamedDeclaration") return
        context.report({
          node: node.id,
          message: "Private function should start with an underscore.",
        })
      },
      MethodDefinition(node) {
        if (node.accessibility === "private") {
          if (node.key.type !== "Identifier") return
          if (node.key.name.startsWith("_")) return
          context.report({
            node: node.key,
            message: "Private method should start with an underscore.",
          })
          return
        }
        if (node.accessibility === "public" || node.accessibility === null) {
          if (node.key.type !== "Identifier") return
          if (!node.key.name.startsWith("_")) return
          context.report({
            node: node.key,
            message: "Public method should not start with an underscore.",
          })
          return
        }
      },
      PropertyDefinition(node) {
        if (node.accessibility === "private") {
          if (node.key.type !== "Identifier") return
          if (node.key.name.startsWith("_")) return
          context.report({
            node: node.key,
            message: "Private property should start with an underscore.",
          })
          return
        }
        if (node.accessibility === "public" || node.accessibility === null) {
          if (node.key.type !== "Identifier") return
          if (!node.key.name.startsWith("_")) return
          context.report({
            node: node.key,
            message: "Public property should not start with an underscore.",
          })
          return
        }
      },
    }
  },
} satisfies Rule
