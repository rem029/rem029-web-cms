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

export const scopeCustomCss = (css: string | null | undefined, formId: number): string => {
  // 1. empty → ''
  // 2. remove comments (/* … */) so braces inside them don't count
  // 3. remove every '<'
  // 4. drop @import statements (up to the next ';')
  // 5. walk the braces: depth below 0 or not 0 at the end → '' (unbalanced)
  // 6. `[data-form-id="${formId}"] {\n${css}\n}`
  throw new Error('not implemented')
}
