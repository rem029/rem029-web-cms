import * as migration_20250508_082212_initial_commit from './20250508_082212_initial_commit';
import * as migration_20250508_082216_add_admin_role from './20250508_082216_add_admin_role';

export const migrations = [
  {
    up: migration_20250508_082212_initial_commit.up,
    down: migration_20250508_082212_initial_commit.down,
    name: '20250508_082212_initial_commit',
  },
  {
    up: migration_20250508_082216_add_admin_role.up,
    down: migration_20250508_082216_add_admin_role.down,
    name: '20250508_082216_add_admin_role'
  },
];
