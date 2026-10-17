import type { TypedLocale } from 'payload'

/**
 * The guest menu pages' own words in English and Arabic (rem0017 phase 3). Content (titles,
 * descriptions) comes localized from Payload; these are the labels around it.
 */
const EN = {
  menus: 'Menus',
  noMenus: 'No menus yet.',
  other: 'Other',
  outOfStock: 'Out of stock',
  search: 'Search the menu',
  noResults: 'No results',
  searchFailed: 'Search failed. Try again.',
  close: 'Close',
  allergens: 'Allergens',
  tags: 'Tags',
  options: 'Options',
  required: 'Required',
  chooseOne: 'Choose one',
  chooseAny: 'Choose any',
  availability: 'Served',
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  all_day: 'All day',
  all: 'All',
  backToTop: 'Back to top',
  allMenus: 'All menus',
  menuNotFound: 'This menu could not be found.',
}

export type MenuStrings = Record<keyof typeof EN, string>

const STRINGS: Record<TypedLocale, MenuStrings> = {
  en: EN,
  ar: {
    menus: 'القوائم',
    noMenus: 'لا توجد قوائم بعد.',
    other: 'أخرى',
    outOfStock: 'غير متوفر',
    search: 'ابحث في القائمة',
    noResults: 'لا توجد نتائج',
    searchFailed: 'تعذر البحث. حاول مرة أخرى.',
    close: 'إغلاق',
    allergens: 'مسببات الحساسية',
    tags: 'الوسوم',
    options: 'الخيارات',
    required: 'مطلوب',
    chooseOne: 'اختر واحدًا',
    chooseAny: 'اختر ما تشاء',
    availability: 'يقدم',
    breakfast: 'الإفطار',
    lunch: 'الغداء',
    dinner: 'العشاء',
    all_day: 'طوال اليوم',
    all: 'الكل',
    backToTop: 'العودة للأعلى',
    allMenus: 'كل القوائم',
    menuNotFound: 'لم يتم العثور على هذه القائمة.',
  },
}

export const menuStrings = (locale: TypedLocale): MenuStrings => STRINGS[locale] ?? STRINGS.en
