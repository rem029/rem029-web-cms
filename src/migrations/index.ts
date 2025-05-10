import * as migration_20250508_082212_initial_commit from './20250508_082212_initial_commit';
import * as migration_20250508_082216_add_admin_role from './20250508_082216_add_admin_role';
import * as migration_20250510_172522_removed_hero from './20250510_172522_removed_hero';
import * as migration_20250510_201923_added_new_hero_and_carousel_blocks from './20250510_201923_added_new_hero_and_carousel_blocks';

export const migrations = [
  {
    up: migration_20250508_082212_initial_commit.up,
    down: migration_20250508_082212_initial_commit.down,
    name: '20250508_082212_initial_commit',
  },
  {
    up: migration_20250508_082216_add_admin_role.up,
    down: migration_20250508_082216_add_admin_role.down,
    name: '20250508_082216_add_admin_role',
  },
  {
    up: migration_20250510_172522_removed_hero.up,
    down: migration_20250510_172522_removed_hero.down,
    name: '20250510_172522_removed_hero',
  },
  {
    up: migration_20250510_201923_added_new_hero_and_carousel_blocks.up,
    down: migration_20250510_201923_added_new_hero_and_carousel_blocks.down,
    name: '20250510_201923_added_new_hero_and_carousel_blocks'
  },
];
