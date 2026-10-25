import {defineConfig} from "oxlint"

export default defineConfig({
  plugins: ["typescript", "unicorn", "oxc", "import"],
  jsPlugins: ["./dist/index.js"],
  categories: {
    correctness: "error",
    suspicious: "warn",
    perf: "warn",
  },
  env: {
    builtin: true,
    browser: true,
    node: true,
  },
  options: {
    typeAware: true,
  },
  rules: {
    "aspizuism/block-style": "error",
    "aspizuism/func-style": "error",
    "aspizuism/no-comments": "error",
    "aspizuism/private-prefix": "error",
    "no-nested-ternary": "error",
    "no-underscore-dangle": "off",
    "sort-imports": "off",
    "max-depth": "error",
    "typescript/no-deprecated": "error",
    complexity: "error",
    "max-lines": ["error", {max: 200, skipBlankLines: true, skipComments: true}],
    "import/no-unassigned-import": ["error", {allow: ["**/*.css"]}],
  },
})
