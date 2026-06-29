import eslintJs from "@eslint/js"
import eslintTs from "typescript-eslint"

export default eslintTs.config(
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  eslintJs.configs.recommended,
  eslintTs.configs.recommended,
)
