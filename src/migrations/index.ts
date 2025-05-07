import * as migration_20250507_171858_initial_migration from './20250507_171858_initial_migration';
import * as migration_20250507_171921_add_role from './20250507_171921_add_role';

export const migrations = [
  {
    up: migration_20250507_171858_initial_migration.up,
    down: migration_20250507_171858_initial_migration.down,
    name: '20250507_171858_initial_migration',
  },
  {
    up: migration_20250507_171921_add_role.up,
    down: migration_20250507_171921_add_role.down,
    name: '20250507_171921_add_role'
  },
];
