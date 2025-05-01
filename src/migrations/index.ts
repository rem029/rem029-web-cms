import * as migration_20250501_120519_add_themes from './20250501_120519_add_themes';

export const migrations = [
  {
    up: migration_20250501_120519_add_themes.up,
    down: migration_20250501_120519_add_themes.down,
    name: '20250501_120519_add_themes'
  },
];
