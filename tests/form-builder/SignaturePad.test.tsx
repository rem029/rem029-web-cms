// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

// step 5 (critique P0). `signature_pad` and the canvas 2d context are mocked: jsdom has no canvas,
// and they are outside edges. The mocks keep the `endStroke` listener so a test can fire strokes.

describe('SignaturePad', () => {
  afterEach(() => {
    // cleanup(), restore timers and the canvas stubs
  })

  it('names the drawing area for screen readers', () => {
    // arrange: render <SignaturePad label="Signature" … />
    // act: -
    // assert: getByRole('img', { name: /Signature, draw your signature/ })
    expect.fail('not implemented')
  })

  it('offers a typed name instead of drawing', () => {
    // arrange: render the pad
    // act: -
    // assert: getByLabelText('Or type your full name') is a text input
    expect.fail('not implemented')
  })

  it('hands over one file after the visitor stops drawing', () => {
    // arrange: fake timers, render with an onChange spy
    // act: fire endStroke three times 100 ms apart, then advance 800 ms
    // assert: onChange called once, with a File named signature.png
    expect.fail('not implemented')
  })

  it('signs with a typed name on leaving the input', () => {
    // arrange: render with an onChange spy
    // act: type "Sara Ali" in the typed input, blur it
    // assert: the name was drawn on the canvas (fillText) and onChange got one File
    expect.fail('not implemented')
  })

  it('drops a pending signature when cleared', () => {
    // arrange: fake timers, render with an onChange spy
    // act: fire endStroke, click Clear, advance 800 ms
    // assert: onChange called once, with null (no file)
    expect.fail('not implemented')
  })
})
