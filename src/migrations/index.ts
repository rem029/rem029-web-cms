import * as migration_20250507_111859_initial_migration from './20250507_111859_initial_migration';
import * as migration_20250507_112142_create_default_role from './20250507_112142_create_default_role';

export const migrations = [
  {
    up: migration_20250507_111859_initial_migration.up,
    down: migration_20250507_111859_initial_migration.down,
    name: '20250507_111859_initial_migration',
  },
  {
    up: migration_20250507_112142_create_default_role.up,
    down: migration_20250507_112142_create_default_role.down,
    name: '20250507_112142_create_default_role'
  },
];
