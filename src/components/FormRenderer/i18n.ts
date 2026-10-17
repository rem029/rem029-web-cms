/**
 * The renderer's own words (buttons, errors, list and upload hints) in English and Arabic.
 * Field labels come from the form itself (localized in the admin); only these fixed strings
 * live here. Used by every renderer component through `formText(locale)`.
 */
import type { FormRefusal } from '@/common/utils/formAvailability'

import type { RendererLocale } from './types'

export type FormText = {
  next: string
  back: string
  review: string
  edit: string
  submit: string
  submitting: string
  choose: string
  addRow: (label: string) => string
  removeRow: (label: string, row: number) => string
  row: (label: string, row: number) => string
  required: string
  fixErrors: (count: number) => string
  uploading: string
  uploadHint: string
  tooLarge: string
  wrongType: string
  fileAttached: string
  signed: string
  clearSignature: string
  yes: string
  no: string
  stepOf: (current: number, total: number) => string
  somethingWrong: string
  draftSaved: string
  formClosed: string
  notOpenYet: string
  membersOnly: string
  tooMany: string
  acceptTerms: string
  termsRequired: string
}

const en: FormText = {
  next: 'Next',
  back: 'Back',
  review: 'Review',
  edit: 'Edit',
  submit: 'Submit',
  submitting: 'Sending…',
  choose: 'Choose…',
  addRow: (label) => `Add ${label}`,
  removeRow: (label, row) => `Remove ${label} ${row}`,
  row: (label, row) => `${label} ${row}`,
  required: 'This field is required.',
  fixErrors: (count) =>
    count === 1
      ? 'Please fix the highlighted field.'
      : `Please fix the ${count} highlighted fields.`,
  uploading: 'Uploading…',
  uploadHint: 'Images or PDF, up to 10 MB.',
  tooLarge: 'Files can be up to 10 MB.',
  wrongType: 'Use an image (JPEG, PNG, WebP) or a PDF.',
  fileAttached: 'File attached',
  signed: 'Signed',
  clearSignature: 'Clear',
  yes: 'Yes',
  no: 'No',
  stepOf: (current, total) => `Step ${current} of ${total}`,
  somethingWrong: 'Something went wrong. Please try again.',
  draftSaved: 'Draft saved on this device',
  formClosed: "This form isn't taking answers right now.",
  notOpenYet: "This form isn't open yet. Please come back later.",
  membersOnly: 'Please sign in as a member to fill in this form.',
  tooMany: 'Too many attempts. Please wait a few minutes and try again.',
  acceptTerms: 'I accept the terms and conditions',
  termsRequired: 'Please accept the terms to continue.',
}

const ar: FormText = {
  next: 'التالي',
  back: 'السابق',
  review: 'مراجعة',
  edit: 'تعديل',
  submit: 'إرسال',
  submitting: 'جارٍ الإرسال…',
  choose: 'اختر…',
  addRow: (label) => `إضافة ${label}`,
  removeRow: (label, row) => `حذف ${label} ${row}`,
  row: (label, row) => `${label} ${row}`,
  required: 'هذا الحقل مطلوب.',
  fixErrors: (count) =>
    count === 1 ? 'يرجى تصحيح الحقل المحدد.' : `يرجى تصحيح الحقول المحددة (${count}).`,
  uploading: 'جارٍ الرفع…',
  uploadHint: 'صور أو PDF، حتى 10 ميغابايت.',
  tooLarge: 'يمكن أن يصل حجم الملف إلى 10 ميغابايت.',
  wrongType: 'استخدم صورة (JPEG أو PNG أو WebP) أو ملف PDF.',
  fileAttached: 'تم إرفاق ملف',
  signed: 'تم التوقيع',
  clearSignature: 'مسح',
  yes: 'نعم',
  no: 'لا',
  stepOf: (current, total) => `الخطوة ${current} من ${total}`,
  somethingWrong: 'حدث خطأ. يرجى المحاولة مرة أخرى.',
  draftSaved: 'تم حفظ المسودة على هذا الجهاز',
  formClosed: 'هذا النموذج لا يستقبل إجابات حاليًا.',
  notOpenYet: 'هذا النموذج غير متاح بعد. يرجى العودة لاحقًا.',
  membersOnly: 'يرجى تسجيل الدخول كعضو لتعبئة هذا النموذج.',
  tooMany: 'محاولات كثيرة. يرجى الانتظار بضع دقائق ثم المحاولة مرة أخرى.',
  acceptTerms: 'أوافق على الشروط والأحكام',
  termsRequired: 'يرجى الموافقة على الشروط للمتابعة.',
}

export const formText = (locale: RendererLocale): FormText => (locale === 'ar' ? ar : en)

/** Why a form takes no answers, in the visitor's words (the submit action and `/forms/<slug>`). */
export const refusalMessage = (reason: FormRefusal, text: FormText): string => {
  if (reason === 'not_open_yet') return text.notOpenYet
  if (reason === 'members_only') return text.membersOnly
  return text.formClosed
}
