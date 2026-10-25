// Money in minor units (rem0018 phase 1 step 3a, src/common/utils/money.ts): pure, no db.
import { describe, expect, it } from 'vitest'

import { currencyDigits, formatMinor, fromMinor, toMinor } from '@/common/utils/money'

describe('money', () => {
  it('converts with two and three decimal currencies', () => {
    // arrange: QAR (2 digits), KWD (3 digits), JPY (0 digits)
    const qar = 'QAR'
    const kwd = 'KWD'
    const jpy = 'JPY'

    // act: currencyDigits, toMinor(12.5), toMinor(0.1 + 0.2) for QAR, toMinor(1.25) for KWD,
    //      fromMinor(1250) for QAR and KWD, toMinor(500) for JPY
    const qarDigits = currencyDigits(qar)
    const kwdDigits = currencyDigits(kwd)
    const jpyDigits = currencyDigits(jpy)

    const qarMinor = toMinor(12.5, qar)
    const qarRounded = toMinor(0.1 + 0.2, qar)
    const kwdMinor = toMinor(1.25, kwd)
    const jpyMinor = toMinor(500, jpy)

    const qarBack = fromMinor(1250, qar)
    const kwdBack = fromMinor(1250, kwd)

    // assert: digits 2 / 3 / 0; QAR 12.5 → 1250, 0.1 + 0.2 → 30 (rounded, no float drift),
    //         KWD 1.25 → 1250; 1250 back → 12.5 QAR, 1.25 KWD; JPY 500 → 500
    expect(qarDigits).toBe(2)
    expect(kwdDigits).toBe(3)
    expect(jpyDigits).toBe(0)

    expect(qarMinor).toBe(1250)
    expect(qarRounded).toBe(30)
    expect(kwdMinor).toBe(1250)
    expect(jpyMinor).toBe(500)

    expect(qarBack).toBe(12.5)
    expect(kwdBack).toBe(1.25)
  })

  it('formats minor units with the currency digits', () => {
    // arrange: 150 USD, 1500 KWD (3 digits), 500 JPY (0 digits), 0 QAR
    // act: formatMinor(…, 'en')
    // assert: "$1.50", "KWD 1.500", "¥500", "QAR 0.00"
    expect(formatMinor(150, 'USD', 'en')).toBe('$1.50')
    expect(formatMinor(1500, 'KWD', 'en')).toBe('KWD\u00a01.500')
    expect(formatMinor(500, 'JPY', 'en')).toBe('¥500')
    expect(formatMinor(0, 'QAR', 'en')).toBe('QAR\u00a00.00')
  })
})
