import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * rem0001 phase 2: roles → users-access profiles, then drop `roles` and `users.role_id`.
 *
 * up:
 * - one profile per role, one row per slug below. a slug's permission is the role's
 *   `collections` row OR its `globals` row (the old check read both for every slug).
 * - header/footer/theme/settings: read + update only (create/delete were always super user only).
 * - tenants: read for everyone (keeps the tenant selector). users: `admin` for everyone
 *   (`/admin` was open to every signed-in user). hidden = !read.
 * - `default` profile: only `users.admin`. users with a role → that role's profile (super users
 *   too, so `down` can restore their role; they bypass it), non-super users without a role →
 *   `default`.
 *
 * down: a role per profile except `default` (header/footer/theme/settings back under `globals`,
 * `is_admin = slug = 'admin'`), `users.role_id` from `users.access_id`, then all profiles are
 * deleted (the state after the users_access migration, where none existed outside dev seeds).
 * Same roles, users and effective permissions; ids and rows for dropped slugs are not restored.
 */

// frozen at the time of writing; the live config may have more slugs later (missing row = deny)
const SLUGS = [
  'pages',
  'posts',
  'media',
  'categories',
  'users',
  'users-access',
  'analytics',
  'tenants',
  'header',
  'footer',
  'theme',
  'settings',
  'redirects',
  'forms',
  'form-submissions',
  'search',
]
const FORMER_GLOBALS = ['header', 'footer', 'theme', 'settings']
const DEFAULT_SLUG = 'default'
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const slugList = sql.join(
  SLUGS.map((s) => sql`${s}`),
  sql`, `,
)
const formerGlobalsList = sql.join(
  FORMER_GLOBALS.map((s) => sql`${s}`),
  sql`, `,
)
// Payload array row ids are 24-char hex strings
const rowId = sql`substr(md5(random()::text || clock_timestamp()::text), 1, 24)`

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const { rows: collisions } = await db.execute(sql`
    SELECT r.slug AS role_slug, r.name AS role_name, ua.slug AS profile_slug, ua.name AS profile_name
    FROM roles r JOIN users_access ua ON ua.slug = r.slug OR ua.name = r.name
  `)
  if (collisions.length > 0) {
    throw new Error(
      `roles migration: profiles already exist with a role's slug or name, rename them first: ${JSON.stringify(collisions)}`,
    )
  }

  const { rows: skipped } = await db.execute(sql`
    SELECT r.slug AS role, p.collection AS slug FROM roles_collections_permissions p
      JOIN roles r ON r.id = p._parent_id WHERE p.collection NOT IN (${slugList})
    UNION
    SELECT r.slug, g.global FROM roles_globals_permissions g
      JOIN roles r ON r.id = g._parent_id WHERE g.global IS NULL OR g.global NOT IN (${slugList})
  `)
  for (const row of skipped) {
    payload.logger.warn({ msg: 'roles migration: skipping permission for a removed slug', ...row })
  }

  const { rows: roles } = await db.execute(sql`SELECT slug, is_admin FROM roles`)
  for (const role of roles as { slug: string; is_admin: boolean | null }[]) {
    if (role.is_admin && role.slug !== 'admin') {
      payload.logger.warn({
        msg: 'roles migration: isAdmin is not mapped (it was never checked)',
        role: role.slug,
      })
    }
    if (!KEBAB_CASE.test(role.slug)) {
      payload.logger.warn({
        msg: 'roles migration: role slug is not kebab-case, the profile must be renamed before it can be saved in the admin',
        role: role.slug,
      })
    }
  }

  await db.execute(sql`
    INSERT INTO users_access (name, slug, description)
    SELECT name, slug, description FROM roles
  `)

  await db.execute(sql`
    WITH perms AS (
      SELECT ua.id AS profile_id, s.slug, s.ord,
        coalesce(bool_or(p.can_read), false) OR coalesce(bool_or(g.can_read), false) AS can_read,
        coalesce(bool_or(p.can_create), false) AS can_create,
        coalesce(bool_or(p.can_update), false) OR coalesce(bool_or(g.can_update), false) AS can_update,
        coalesce(bool_or(p.can_delete), false) AS can_delete
      FROM roles r
      JOIN users_access ua ON ua.slug = r.slug
      CROSS JOIN unnest(ARRAY[${slugList}]::text[]) WITH ORDINALITY AS s(slug, ord)
      LEFT JOIN roles_collections_permissions p ON p._parent_id = r.id AND p.collection = s.slug
      LEFT JOIN roles_globals_permissions g ON g._parent_id = r.id AND g.global = s.slug
      GROUP BY ua.id, s.slug, s.ord
    ), final AS (
      SELECT profile_id, slug, ord,
        can_read OR slug = 'tenants' AS can_read,
        can_create AND slug NOT IN (${formerGlobalsList}) AS can_create,
        can_update,
        can_delete AND slug NOT IN (${formerGlobalsList}) AS can_delete
      FROM perms
    )
    INSERT INTO users_access_access
      (_order, _parent_id, id, slug, hidden, read, "create", update, delete, admin, access)
    SELECT ord, profile_id, ${rowId}, slug::enum_users_access_access_slug,
      NOT can_read, can_read, can_create, can_update, can_delete, slug = 'users', false
    FROM final
  `)

  const { rows: defaultInserted } = await db.execute(sql`
    INSERT INTO users_access (name, slug, description)
    SELECT 'Default', ${DEFAULT_SLUG}, 'Assigned to new users. Can open the admin panel, nothing else.'
    WHERE NOT EXISTS (SELECT 1 FROM users_access WHERE slug = ${DEFAULT_SLUG})
    RETURNING id
  `)
  const defaultRow = defaultInserted[0] as { id: number } | undefined
  if (defaultRow) {
    await db.execute(sql`
      INSERT INTO users_access_access
        (_order, _parent_id, id, slug, hidden, read, "create", update, delete, admin, access)
      SELECT ord, ${defaultRow.id}, ${rowId}, slug::enum_users_access_access_slug,
        true, false, false, false, false, slug = 'users', false
      FROM unnest(ARRAY[${slugList}]::text[]) WITH ORDINALITY AS s(slug, ord)
    `)
  } else {
    payload.logger.info({ msg: 'roles migration: default profile already exists, kept as is' })
  }

  // rows for slugs that leave the enum below (e.g. `roles`), or the type change fails
  await db.execute(sql`DELETE FROM users_access_access WHERE slug::text NOT IN (${slugList})`)

  const { rows: alreadyAssigned } = await db.execute(sql`
    SELECT email FROM users WHERE role_id IS NOT NULL AND access_id IS NOT NULL
  `)
  for (const row of alreadyAssigned) {
    payload.logger.warn({ msg: 'roles migration: user already has a profile, kept it', ...row })
  }

  const { rows: withRole } = await db.execute(sql`
    UPDATE users u SET access_id = ua.id
    FROM roles r JOIN users_access ua ON ua.slug = r.slug
    WHERE u.role_id = r.id AND u.access_id IS NULL
    RETURNING u.id
  `)
  const { rows: withoutRole } = await db.execute(sql`
    UPDATE users SET access_id = (SELECT id FROM users_access WHERE slug = ${DEFAULT_SLUG})
    WHERE role_id IS NULL AND access_id IS NULL AND super_user IS NOT TRUE
    RETURNING id
  `)

  payload.logger.info({
    msg: 'roles migration: done',
    rolesMigrated: roles.length,
    usersWithRole: withRole.length,
    usersWithoutRole: withoutRole.length,
  })

  await db.execute(sql`DELETE FROM payload_locked_documents_rels WHERE roles_id IS NOT NULL`)

  // generated DDL, reordered: Payload dropped the roles tables CASCADE before dropping the FKs
  // pointing at them (the cascade already removed those, so the DROP CONSTRAINT failed)
  await db.execute(sql`
  ALTER TABLE "users" DROP CONSTRAINT "users_role_id_roles_id_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_roles_fk";
  ALTER TABLE "roles_collections_permissions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "roles_globals_permissions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "roles" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "roles_collections_permissions" CASCADE;
  DROP TABLE "roles_globals_permissions" CASCADE;
  DROP TABLE "roles" CASCADE;

  ALTER TABLE "users_access_access" ALTER COLUMN "slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_access_access_slug";
  CREATE TYPE "public"."enum_users_access_access_slug" AS ENUM('pages', 'posts', 'media', 'categories', 'users', 'users-access', 'analytics', 'tenants', 'header', 'footer', 'theme', 'settings', 'redirects', 'forms', 'form-submissions', 'search');
  ALTER TABLE "users_access_access" ALTER COLUMN "slug" SET DATA TYPE "public"."enum_users_access_access_slug" USING "slug"::"public"."enum_users_access_access_slug";
  DROP INDEX "users_role_idx";
  DROP INDEX "payload_locked_documents_rels_roles_id_idx";
  ALTER TABLE "users" DROP COLUMN "role_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "roles_id";`)
}

export async function down({ db, payload }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_users_access_access_slug" ADD VALUE 'roles' BEFORE 'analytics';
  CREATE TABLE "roles_collections_permissions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"collection" varchar NOT NULL,
  	"can_create" boolean DEFAULT false,
  	"can_read" boolean DEFAULT true,
  	"can_update" boolean DEFAULT false,
  	"can_delete" boolean DEFAULT false
  );

  CREATE TABLE "roles_globals_permissions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"global" varchar,
  	"can_read" boolean DEFAULT true,
  	"can_update" boolean DEFAULT false
  );

  CREATE TABLE "roles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"is_admin" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "users" ADD COLUMN "role_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "roles_id" integer;
  ALTER TABLE "roles_collections_permissions" ADD CONSTRAINT "roles_collections_permissions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "roles_globals_permissions" ADD CONSTRAINT "roles_globals_permissions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "roles_collections_permissions_order_idx" ON "roles_collections_permissions" USING btree ("_order");
  CREATE INDEX "roles_collections_permissions_parent_id_idx" ON "roles_collections_permissions" USING btree ("_parent_id");
  CREATE INDEX "roles_globals_permissions_order_idx" ON "roles_globals_permissions" USING btree ("_order");
  CREATE INDEX "roles_globals_permissions_parent_id_idx" ON "roles_globals_permissions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "roles_name_idx" ON "roles" USING btree ("name");
  CREATE UNIQUE INDEX "roles_slug_idx" ON "roles" USING btree ("slug");
  CREATE INDEX "roles_updated_at_idx" ON "roles" USING btree ("updated_at");
  CREATE INDEX "roles_created_at_idx" ON "roles" USING btree ("created_at");
  ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_roles_fk" FOREIGN KEY ("roles_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_role_idx" ON "users" USING btree ("role_id");
  CREATE INDEX "payload_locked_documents_rels_roles_id_idx" ON "payload_locked_documents_rels" USING btree ("roles_id");`)

  const { rows: roles } = await db.execute(sql`
    INSERT INTO roles (name, slug, description, is_admin)
    SELECT name, slug, description, slug = 'admin' FROM users_access WHERE slug <> ${DEFAULT_SLUG}
    RETURNING id
  `)

  await db.execute(sql`
    INSERT INTO roles_collections_permissions
      (_order, _parent_id, id, collection, can_create, can_read, can_update, can_delete)
    SELECT a._order, r.id, ${rowId}, a.slug::text,
      coalesce(a."create", false), coalesce(a.read, false), coalesce(a.update, false), coalesce(a.delete, false)
    FROM users_access_access a
    JOIN users_access ua ON ua.id = a._parent_id
    JOIN roles r ON r.slug = ua.slug
    WHERE a.slug::text NOT IN (${formerGlobalsList})
  `)
  await db.execute(sql`
    INSERT INTO roles_globals_permissions (_order, _parent_id, id, global, can_read, can_update)
    SELECT a._order, r.id, ${rowId}, a.slug::text, coalesce(a.read, false), coalesce(a.update, false)
    FROM users_access_access a
    JOIN users_access ua ON ua.id = a._parent_id
    JOIN roles r ON r.slug = ua.slug
    WHERE a.slug::text IN (${formerGlobalsList})
  `)

  const { rows: users } = await db.execute(sql`
    UPDATE users u SET role_id = r.id
    FROM users_access ua JOIN roles r ON r.slug = ua.slug
    WHERE u.access_id = ua.id
    RETURNING u.id
  `)

  await db.execute(sql`UPDATE users SET access_id = NULL WHERE access_id IS NOT NULL`)
  const { rows: profiles } = await db.execute(sql`DELETE FROM users_access RETURNING id`)

  payload.logger.info({
    msg: 'roles migration down: done',
    rolesRestored: roles.length,
    usersWithRole: users.length,
    profilesDeleted: profiles.length,
  })
}
