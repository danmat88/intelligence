jest.mock('../../ai', () => ({ ai: { generate: jest.fn(), chat: jest.fn() } }))

import { ai } from '../../ai'
import { parseReadProblemImage, solveImage, startGuidedProblem } from '../solve'

const image = {
  base64: 'YWJj',
  mimeType: 'image/jpeg',
  uri: 'file:///problem.jpg',
  width: 100,
  height: 100,
}

describe('photo statement contract', () => {
  test('acceptă numai transcrierea completă fără soluție', () => {
    expect(parseReadProblemImage(JSON.stringify({
      problem: 'Rezolvă ecuația $2x+1=7$.',
      topic: 'Ecuații',
      containsWork: false,
    }))).toEqual({
      problem: 'Rezolvă ecuația $2x+1=7$.',
      topic: 'Ecuații',
      containsWork: false,
    })
  })

  test('acceptă eroarea controlată și respinge formele incomplete', () => {
    expect(parseReadProblemImage('{"error":"Imaginea este neclară."}')).toEqual({ error: 'Imaginea este neclară.' })
    expect(parseReadProblemImage('{"problem":"x+1=2","topic":"Ecuații"}')).toBeNull()
    expect(parseReadProblemImage('text arbitrar')).toBeNull()
  })

  test('rezolvarea unei fotografii respectă enunțul corectat de utilizator', async () => {
    ;(ai.generate as jest.Mock).mockResolvedValueOnce({
      text: JSON.stringify({ problem: '$2x+1=7$', topic: 'Ecuații', steps: [{ math: '2x=6', why: 'scădem unu' }], answer: '$x=3$' }),
    })

    await solveImage(image, undefined, 'problem_123', 'Rezolvă ecuația $2x+1=7$.')

    expect(ai.generate).toHaveBeenCalledWith(
      expect.stringContaining('ENUNȚ CONFIRMAT:\nRezolvă ecuația $2x+1=7$.'),
      expect.objectContaining({ image: { base64: 'YWJj', mimeType: 'image/jpeg' } }),
    )
  })

  test('ghidarea păstrează imaginea pentru figură fără a cere soluția', async () => {
    ;(ai.generate as jest.Mock).mockResolvedValueOnce({ text: 'Care este primul pas?' })

    await startGuidedProblem('Determină lungimea din figură.', undefined, 'problem_123', image)

    expect(ai.generate).toHaveBeenCalledWith(
      expect.stringContaining('Folosește imaginea numai pentru figură'),
      expect.objectContaining({ image: { base64: 'YWJj', mimeType: 'image/jpeg' } }),
    )
  })
})
