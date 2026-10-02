import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// header, footer, theme and settings were globals; they become one-doc-per-tenant collections.
// Postgres global tables already have id/created_at/updated_at and children pointing at <slug>.id,
// and the slugs are unchanged, so everything is converted in place: no tables are copied.
const TABLES = ['header', 'footer', 'theme', 'settings'] as const

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // a global has at most one row; more means something unexpected, so stop instead of guessing
  for (const table of TABLES) {
    const { rows } = await db.execute(
      sql`SELECT count(*)::int AS count FROM ${sql.identifier(table)}`,
    )
    const count = Number(rows[0]?.count ?? 0)
    if (count > 1) {
      throw new Error(`globals_to_tenant_docs: "${table}" has ${count} rows, expected 0 or 1`)
    }
  }

  // timestamps become NOT NULL below; a global saved before they were set may have nulls
  await db.execute(sql`
  UPDATE "header" SET "created_at" = COALESCE("created_at", "updated_at", now()), "updated_at" = COALESCE("updated_at", now());
  UPDATE "footer" SET "created_at" = COALESCE("created_at", "updated_at", now()), "updated_at" = COALESCE("updated_at", now());
  UPDATE "theme" SET "created_at" = COALESCE("created_at", "updated_at", now()), "updated_at" = COALESCE("updated_at", now());
  UPDATE "settings" SET "created_at" = COALESCE("created_at", "updated_at", now()), "updated_at" = COALESCE("updated_at", now());
  `)

  await db.execute(sql`
   DROP INDEX "theme_themes_active_idx";
  DROP INDEX "theme_themes_name_idx";
  ALTER TABLE "header" ALTER COLUMN "updated_at" SET DEFAULT now();
  ALTER TABLE "header" ALTER COLUMN "updated_at" SET NOT NULL;
  ALTER TABLE "header" ALTER COLUMN "created_at" SET DEFAULT now();
  ALTER TABLE "header" ALTER COLUMN "created_at" SET NOT NULL;
  ALTER TABLE "footer" ALTER COLUMN "updated_at" SET DEFAULT now();
  ALTER TABLE "footer" ALTER COLUMN "updated_at" SET NOT NULL;
  ALTER TABLE "footer" ALTER COLUMN "created_at" SET DEFAULT now();
  ALTER TABLE "footer" ALTER COLUMN "created_at" SET NOT NULL;
  ALTER TABLE "theme" ALTER COLUMN "updated_at" SET DEFAULT now();
  ALTER TABLE "theme" ALTER COLUMN "updated_at" SET NOT NULL;
  ALTER TABLE "theme" ALTER COLUMN "created_at" SET DEFAULT now();
  ALTER TABLE "theme" ALTER COLUMN "created_at" SET NOT NULL;
  ALTER TABLE "settings" ALTER COLUMN "updated_at" SET DEFAULT now();
  ALTER TABLE "settings" ALTER COLUMN "updated_at" SET NOT NULL;
  ALTER TABLE "settings" ALTER COLUMN "created_at" SET DEFAULT now();
  ALTER TABLE "settings" ALTER COLUMN "created_at" SET NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "header_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "footer_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "theme_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "settings_id" integer;
  ALTER TABLE "header" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "footer" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "theme" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "settings" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_header_fk" FOREIGN KEY ("header_id") REFERENCES "public"."header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_footer_fk" FOREIGN KEY ("footer_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_theme_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."theme"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_settings_fk" FOREIGN KEY ("settings_id") REFERENCES "public"."settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header" ADD CONSTRAINT "header_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "footer" ADD CONSTRAINT "footer_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "theme" ADD CONSTRAINT "theme_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "settings" ADD CONSTRAINT "settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_header_id_idx" ON "payload_locked_documents_rels" USING btree ("header_id");
  CREATE INDEX "payload_locked_documents_rels_footer_id_idx" ON "payload_locked_documents_rels" USING btree ("footer_id");
  CREATE INDEX "payload_locked_documents_rels_theme_id_idx" ON "payload_locked_documents_rels" USING btree ("theme_id");
  CREATE INDEX "payload_locked_documents_rels_settings_id_idx" ON "payload_locked_documents_rels" USING btree ("settings_id");
  CREATE UNIQUE INDEX "header_tenant_idx" ON "header" USING btree ("tenant_id");
  CREATE INDEX "header_updated_at_idx" ON "header" USING btree ("updated_at");
  CREATE INDEX "header_created_at_idx" ON "header" USING btree ("created_at");
  CREATE UNIQUE INDEX "footer_tenant_idx" ON "footer" USING btree ("tenant_id");
  CREATE INDEX "footer_updated_at_idx" ON "footer" USING btree ("updated_at");
  CREATE INDEX "footer_created_at_idx" ON "footer" USING btree ("created_at");
  CREATE UNIQUE INDEX "theme_tenant_idx" ON "theme" USING btree ("tenant_id");
  CREATE INDEX "theme_updated_at_idx" ON "theme" USING btree ("updated_at");
  CREATE INDEX "theme_created_at_idx" ON "theme" USING btree ("created_at");
  CREATE UNIQUE INDEX "settings_tenant_idx" ON "settings" USING btree ("tenant_id");
  CREATE INDEX "settings_updated_at_idx" ON "settings" USING btree ("updated_at");
  CREATE INDEX "settings_created_at_idx" ON "settings" USING btree ("created_at");`)

  // the existing doc (if any) belongs to the default tenant created by multi_tenancy_tenants
  const { rows: tenants } = await db.execute(sql`SELECT id FROM "tenants" WHERE slug = 'admin'`)
  const adminId = tenants[0]?.id
  for (const table of TABLES) {
    const { rows } = await db.execute(
      sql`SELECT count(*)::int AS count FROM ${sql.identifier(table)}`,
    )
    if (Number(rows[0]?.count ?? 0) === 0) {
      payload.logger.info(`globals_to_tenant_docs: "${table}" is empty, nothing to move`)
      continue
    }
    if (adminId === undefined) {
      throw new Error(`globals_to_tenant_docs: tenant "admin" not found, can't assign "${table}"`)
    }
    await db.execute(sql`UPDATE ${sql.identifier(table)} SET "tenant_id" = ${adminId}`)
    // admin UI preferences were keyed per global; collections key them per document
    await db.execute(sql`
      UPDATE "payload_preferences" p SET "key" = 'collection-' || ${table}::text || '-' || t."id"
      FROM ${sql.identifier(table)} t
      WHERE p."key" = 'global-' || ${table}::text`)
    payload.logger.info(`globals_to_tenant_docs: moved "${table}" to tenant admin (${adminId})`)
  }

  // the plugin fills tenant in a hook, so (like phase 1) NOT NULL is enforced in the database only
  await db.execute(sql`
  ALTER TABLE "header" ALTER COLUMN "tenant_id" SET NOT NULL;
  ALTER TABLE "footer" ALTER COLUMN "tenant_id" SET NOT NULL;
  ALTER TABLE "theme" ALTER COLUMN "tenant_id" SET NOT NULL;
  ALTER TABLE "settings" ALTER COLUMN "tenant_id" SET NOT NULL;
  `)
}
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // the old schema has a unique index on theme_themes.active (a boolean), so it holds at most one
  // active and one inactive theme. check first, so a rollback fails with an actionable message
  // (it would fail anyway when the index is recreated; the transaction undoes everything either way)
  const { rows: themeCounts } = await db.execute(sql`
    SELECT x."active", count(*)::int AS count
    FROM "theme_themes" x
    JOIN "theme" t ON t."id" = x."_parent_id"
    JOIN "tenants" ten ON ten."id" = t."tenant_id"
    WHERE ten."slug" = 'admin'
    GROUP BY x."active"`)
  for (const row of themeCounts) {
    const count = Number(row.count)
    if (count > 1) {
      const kind = row.active ? 'active' : 'inactive'
      throw new Error(
        `globals_to_tenant_docs down: the admin theme has ${count} ${kind} themes, the pre-multi-tenancy ` +
          `schema allows one. Remove the extra ${kind} themes, then run the rollback again.`,
      )
    }
  }

  // a global holds one row: keep the default tenant's doc, drop the other tenants' docs
  // (children are removed by their ON DELETE CASCADE foreign keys)
  for (const table of TABLES) {
    await db.execute(sql`
      UPDATE "payload_preferences" p SET "key" = 'global-' || ${table}::text
      FROM ${sql.identifier(table)} t JOIN "tenants" ten ON ten."id" = t."tenant_id"
      WHERE ten."slug" = 'admin' AND p."key" = 'collection-' || ${table}::text || '-' || t."id"`)
    const { rows } = await db.execute(sql`
      DELETE FROM ${sql.identifier(table)} t USING "tenants" ten
      WHERE ten."id" = t."tenant_id" AND ten."slug" <> 'admin'
      RETURNING t."id"`)
    payload.logger.info(
      `globals_to_tenant_docs down: removed ${rows.length} non-admin "${table}" docs`,
    )
  }

  await db.execute(sql`
   ALTER TABLE "header" DROP CONSTRAINT "header_tenant_id_tenants_id_fk";
  
  ALTER TABLE "footer" DROP CONSTRAINT "footer_tenant_id_tenants_id_fk";
  
  ALTER TABLE "theme" DROP CONSTRAINT "theme_tenant_id_tenants_id_fk";
  
  ALTER TABLE "settings" DROP CONSTRAINT "settings_tenant_id_tenants_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_header_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_footer_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_theme_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_settings_fk";
  
  DROP INDEX "header_tenant_idx";
  DROP INDEX "header_updated_at_idx";
  DROP INDEX "header_created_at_idx";
  DROP INDEX "footer_tenant_idx";
  DROP INDEX "footer_updated_at_idx";
  DROP INDEX "footer_created_at_idx";
  DROP INDEX "theme_tenant_idx";
  DROP INDEX "theme_updated_at_idx";
  DROP INDEX "theme_created_at_idx";
  DROP INDEX "settings_tenant_idx";
  DROP INDEX "settings_updated_at_idx";
  DROP INDEX "settings_created_at_idx";
  DROP INDEX "payload_locked_documents_rels_header_id_idx";
  DROP INDEX "payload_locked_documents_rels_footer_id_idx";
  DROP INDEX "payload_locked_documents_rels_theme_id_idx";
  DROP INDEX "payload_locked_documents_rels_settings_id_idx";
  ALTER TABLE "header" ALTER COLUMN "updated_at" DROP DEFAULT;
  ALTER TABLE "header" ALTER COLUMN "updated_at" DROP NOT NULL;
  ALTER TABLE "header" ALTER COLUMN "created_at" DROP DEFAULT;
  ALTER TABLE "header" ALTER COLUMN "created_at" DROP NOT NULL;
  ALTER TABLE "footer" ALTER COLUMN "updated_at" DROP DEFAULT;
  ALTER TABLE "footer" ALTER COLUMN "updated_at" DROP NOT NULL;
  ALTER TABLE "footer" ALTER COLUMN "created_at" DROP DEFAULT;
  ALTER TABLE "footer" ALTER COLUMN "created_at" DROP NOT NULL;
  ALTER TABLE "theme" ALTER COLUMN "updated_at" DROP DEFAULT;
  ALTER TABLE "theme" ALTER COLUMN "updated_at" DROP NOT NULL;
  ALTER TABLE "theme" ALTER COLUMN "created_at" DROP DEFAULT;
  ALTER TABLE "theme" ALTER COLUMN "created_at" DROP NOT NULL;
  ALTER TABLE "settings" ALTER COLUMN "updated_at" DROP DEFAULT;
  ALTER TABLE "settings" ALTER COLUMN "updated_at" DROP NOT NULL;
  ALTER TABLE "settings" ALTER COLUMN "created_at" DROP DEFAULT;
  ALTER TABLE "settings" ALTER COLUMN "created_at" DROP NOT NULL;
  CREATE UNIQUE INDEX "theme_themes_active_idx" ON "theme_themes" USING btree ("active");
  CREATE UNIQUE INDEX "theme_themes_name_idx" ON "theme_themes" USING btree ("name");
  ALTER TABLE "header" DROP COLUMN "tenant_id";
  ALTER TABLE "footer" DROP COLUMN "tenant_id";
  ALTER TABLE "theme" DROP COLUMN "tenant_id";
  ALTER TABLE "settings" DROP COLUMN "tenant_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "header_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "footer_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "theme_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "settings_id";`)
}
