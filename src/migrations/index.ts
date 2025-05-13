import * as migration_20250508_082212_initial_commit from './20250508_082212_initial_commit';
import * as migration_20250508_082216_add_admin_role from './20250508_082216_add_admin_role';
import * as migration_20250510_172522_removed_hero from './20250510_172522_removed_hero';
import * as migration_20250510_201923_added_new_hero_and_carousel_blocks from './20250510_201923_added_new_hero_and_carousel_blocks';
import * as migration_20250511_101426_update_default_themes__update_link_variant from './20250511_101426_update_default_themes__update_link_variant';
import * as migration_20250511_141238_update_fields_with_icons_and_some_fixes from './20250511_141238_update_fields_with_icons_and_some_fixes';
import * as migration_20250512_123010_add_site_name_on_settings from './20250512_123010_add_site_name_on_settings';
import * as migration_20250513_085451_added_more_support_on_locales from './20250513_085451_added_more_support_on_locales';
import * as migration_20250513_101646_add_element_ID_on_cards_button from './20250513_101646_add_element_ID_on_cards_button';
import * as migration_20250513_230042_add_category_for_pages from './20250513_230042_add_category_for_pages';

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
    name: '20250510_201923_added_new_hero_and_carousel_blocks',
  },
  {
    up: migration_20250511_101426_update_default_themes__update_link_variant.up,
    down: migration_20250511_101426_update_default_themes__update_link_variant.down,
    name: '20250511_101426_update_default_themes__update_link_variant',
  },
  {
    up: migration_20250511_141238_update_fields_with_icons_and_some_fixes.up,
    down: migration_20250511_141238_update_fields_with_icons_and_some_fixes.down,
    name: '20250511_141238_update_fields_with_icons_and_some_fixes',
  },
  {
    up: migration_20250512_123010_add_site_name_on_settings.up,
    down: migration_20250512_123010_add_site_name_on_settings.down,
    name: '20250512_123010_add_site_name_on_settings',
  },
  {
    up: migration_20250513_085451_added_more_support_on_locales.up,
    down: migration_20250513_085451_added_more_support_on_locales.down,
    name: '20250513_085451_added_more_support_on_locales',
  },
  {
    up: migration_20250513_101646_add_element_ID_on_cards_button.up,
    down: migration_20250513_101646_add_element_ID_on_cards_button.down,
    name: '20250513_101646_add_element_ID_on_cards_button',
  },
  {
    up: migration_20250513_230042_add_category_for_pages.up,
    down: migration_20250513_230042_add_category_for_pages.down,
    name: '20250513_230042_add_category_for_pages'
  },
];
