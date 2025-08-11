import eslintJs from "@eslint/js"
import eslintTs from "typescript-eslint"

export default eslintTs.config(eslintJs.configs.recommended, eslintTs.configs.recommended, {
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
  },
})
