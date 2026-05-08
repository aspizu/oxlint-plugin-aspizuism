# oxlint-plugin-aspizuism

oxlint plugin to enforce my personal JS coding style.

#### Install the plugin

```bash
pnpm add -D oxlint-plugin-aspizuism
```

#### Add to `oxlint.config.ts`

```ts
import {defineConfig} from "oxlint"
...

export default defineConfig({
  ...
  jsPlugins: ["oxlint-plugin-aspizuism"],
  rules: {
    ...
    "aspizuism/block-style": "error",
    "aspizuism/func-style": "error",
    "aspizuism/no-comments": "error",
    "aspizuism/private-prefix": "error",
  },
  options: {typeAware: true},
})
```
