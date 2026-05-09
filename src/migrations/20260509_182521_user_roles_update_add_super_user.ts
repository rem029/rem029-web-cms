import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$
  BEGIN
    -- Drop NOT NULL constraint if it exists
    ALTER TABLE "users" ALTER COLUMN "role_id" DROP NOT NULL;

    -- Add super_user column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'super_user'
    ) THEN
      ALTER TABLE "users" ADD COLUMN "super_user" boolean DEFAULT false;
    END IF;
  END $$;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DO $$
  BEGIN
    -- Set NOT NULL constraint back
    ALTER TABLE "users" ALTER COLUMN "role_id" SET NOT NULL;

    -- Drop super_user column if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'super_user'
    ) THEN
      ALTER TABLE "users" DROP COLUMN "super_user";
    END IF;
  END $$;`)
}
