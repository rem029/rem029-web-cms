import * as migration_20250507_171858_initial_migration from './20250507_171858_initial_migration';
import * as migration_20250507_171921_add_role from './20250507_171921_add_role';
import * as migration_20250507_190616_css_default_value_update from './20250507_190616_css_default_value_update';

export const migrations = [
  {
    up: migration_20250507_171858_initial_migration.up,
    down: migration_20250507_171858_initial_migration.down,
    name: '20250507_171858_initial_migration',
  },
  {
    up: migration_20250507_171921_add_role.up,
    down: migration_20250507_171921_add_role.down,
    name: '20250507_171921_add_role',
  },
  {
    up: migration_20250507_190616_css_default_value_update.up,
    down: migration_20250507_190616_css_default_value_update.down,
    name: '20250507_190616_css_default_value_update'
  },
];
