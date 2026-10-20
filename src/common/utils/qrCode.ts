import QRCode from 'qrcode'

/**
 * QR codes for table urls (rem0018), generated on demand: nothing stored, so a renamed menu
 * or table never leaves an old code behind. Pure: no `payload` import.
 */

/** A png QR code of `url` (about 512 px, a quiet zone of 2 modules). */
export const qrPng = async (url: string): Promise<Buffer> => {
  return QRCode.toBuffer(url, { type: 'png', width: 512, margin: 2, errorCorrectionLevel: 'M' })
}

/** An svg QR code of `url`, scalable for print. */
export const qrSvg = async (url: string): Promise<string> => {
  return QRCode.toString(url, { type: 'svg', margin: 2, errorCorrectionLevel: 'M' })
}
