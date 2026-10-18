/**
 * Scopes a form's Custom CSS (Appearance tab) to that form only, so an editor can restyle the
 * form without touching the rest of the site: the rules are nested inside
 * `[data-form-id="<id>"] { … }` (CSS nesting), the selector `FormRenderer` puts on its root.
 * Rendered by `FormRenderer` in a `<style>`. Pure, unit tested in
 * `tests/form-builder/customCss.test.ts`.
 *
 * Safety: the css is the editor's own (same trust as page content) but it lands in a `<style>`
 * on the public site, so:
 * - `<` is removed (no `</style><script>` breakout)
 * - `@import` is dropped (no loading other stylesheets)
 * - unbalanced braces drop the whole css (a stray `}` would close the scope and leak out)
 */

/** Whether every `}` closes an earlier `{` and none stay open. */
const bracesBalanced = (css: string): boolean => {
  let depth = 0
  for (const char of css) {
    if (char === '{') depth++
    if (char === '}') depth--
    if (depth < 0) return false
  }
  return depth === 0
}

export const scopeCustomCss = (css: string | null | undefined, formId: number): string => {
  if (!css?.trim()) return ''
  const cleaned = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/</g, '')
    .replace(/@import[^;]*;?/gi, '')
    .trim()
  if (!cleaned || !bracesBalanced(cleaned)) return ''
  return `[data-form-id="${formId}"] {\n${cleaned}\n}`
}
