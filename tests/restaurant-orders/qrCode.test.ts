// QR code files (rem0018 phase 1 step 1b, src/common/utils/qrCode.ts): png for download, svg for
// print. The url inside is checked through menuQr.test.ts (built from tableOrderURL).
import { describe, expect, it } from 'vitest'

import { qrPng, qrSvg } from '@/common/utils/qrCode'

describe('qrCode', () => {
  it('returns a png image', async () => {
    // arrange: url 'https://a.example/menu/x?table=1'
    const url = 'https://a.example/menu/x?table=1'

    // act: qrPng(url)
    const png = await qrPng(url)

    // assert: a Buffer starting with the png signature (89 50 4E 47)
    expect(Buffer.isBuffer(png)).toBe(true)
    expect(png.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
  })

  it('returns an svg document', async () => {
    // arrange: the same url
    const url = 'https://a.example/menu/x?table=1'

    // act: qrSvg(url)
    const svg = await qrSvg(url)

    // assert: a string starting with "<svg" (or an xml prolog then <svg)
    expect(typeof svg).toBe('string')
    expect(svg.trimStart()).toMatch(/^(<\?xml[^>]*\?>\s*)?<svg/)
  })
})
