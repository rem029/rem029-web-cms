import * as migration_20250506_184925_initial_migration from './20250506_184925_initial_migration';
import * as migration_20250506_203425_add_roles from './20250506_203425_add_roles';
import * as migration_20250506_203458_seed_default_admin_role from './20250506_203458_seed_default_admin_role';

export const migrations = [
  {
    up: migration_20250506_184925_initial_migration.up,
    down: migration_20250506_184925_initial_migration.down,
    name: '20250506_184925_initial_migration',
  },
  {
    up: migration_20250506_203425_add_roles.up,
    down: migration_20250506_203425_add_roles.down,
    name: '20250506_203425_add_roles',
  },
  {
    up: migration_20250506_203458_seed_default_admin_role.up,
    down: migration_20250506_203458_seed_default_admin_role.down,
    name: '20250506_203458_seed_default_admin_role'
  },
];
