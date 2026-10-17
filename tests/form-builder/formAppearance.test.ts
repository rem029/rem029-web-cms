import { describe, expect, it } from 'vitest'

describe('form appearance', () => {
  it('fills appearance defaults on a new form', async () => {
    // arrange: a form without appearance
    // act: create it
    // assert: width medium, card card, density comfortable, field_style outlined, label_position
    //   above, radius medium, button_style solid, step_indicator progress, background_overlay none
    expect.fail('not implemented')
  })

  it('saves custom css and appearance choices', async () => {
    // arrange: appearance { width: 'wide', field_style: 'underlined', step_indicator: 'dots',
    //   accent_color: '#0f766e' } and custom_css '.fb-button { letter-spacing: 0.1em }'
    // act: create, read back
    // assert: every value saved as sent
    expect.fail('not implemented')
  })

  it('refuses an accent colour that is not hex', async () => {
    // arrange: accent_color 'red; background: url(x)'
    // act: create
    // assert: rejects with 'Use a hex colour'
    expect.fail('not implemented')
  })

  it('refuses an end date before the start date', async () => {
    // arrange: activeFrom tomorrow, activeTo today
    // act: create
    // assert: rejects with 'end date must be after the start date'
    expect.fail('not implemented')
  })
})
