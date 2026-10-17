// The `ui` field at the top of the Field showcase. Styled by `admin-theme/_fields.scss` only.
export function ShowcaseBanner() {
  return (
    <div className="showcase-banner">
      <p className="showcase-banner__title">Field showcase</p>
      <p className="showcase-banner__text">
        One field of every type, used to check the admin theme in light and dark. Saving here is
        safe: nothing on the public site reads it.
      </p>
    </div>
  )
}
