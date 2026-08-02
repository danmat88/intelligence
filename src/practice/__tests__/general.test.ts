jest.mock('../../ai', () => ({ ai: { generate: jest.fn() } }))

import {
  generalPracticeAnswerMatches,
  normalizePracticeAnswer,
  parseGeneralPracticeExercise,
} from '../general'

const valid = JSON.stringify({
  topic: 'Ecuații',
  competency: 'Rezolvarea ecuațiilor de gradul I',
  prompt: 'Rezolvă ecuația 3x + 2 = 14.',
  answerLabel: 'x =',
  acceptedAnswers: ['4', 'x=4'],
  hints: ['Scade 2 din ambii membri.', 'Împarte apoi la 3.'],
  solutionSteps: ['3x = 12', 'x = 4'],
  finalAnswer: '4',
})

describe('general practice contract', () => {
  test('acceptă numai exercițiul structurat complet', () => {
    const exercise = parseGeneralPracticeExercise(valid, 'practice-1')
    expect(exercise).toMatchObject({
      id: 'practice-1',
      topic: 'Ecuații',
      prompt: 'Rezolvă ecuația 3x + 2 = 14.',
      finalAnswer: '4',
    })
  })

  test('respinge răspunsuri incomplete sau câmpuri supradimensionate', () => {
    expect(parseGeneralPracticeExercise('{"prompt":"x+1=2"}', 'bad')).toBeNull()
    expect(parseGeneralPracticeExercise(JSON.stringify({
      ...JSON.parse(valid),
      prompt: 'x'.repeat(1201),
    }), 'bad')).toBeNull()
  })

  test('acceptă fence JSON fără a accepta proză arbitrară', () => {
    expect(parseGeneralPracticeExercise(`\`\`\`json\n${valid}\n\`\`\``, 'fenced')).not.toBeNull()
    expect(parseGeneralPracticeExercise(`Iată exercițiul: ${valid}`, 'prose')).toBeNull()
  })

  test('normalizează forme uzuale fără să considere răspunsul gol corect', () => {
    const exercise = parseGeneralPracticeExercise(valid, 'practice-1')!
    expect(generalPracticeAnswerMatches(exercise, ' x = 4 ')).toBe(true)
    expect(generalPracticeAnswerMatches(exercise, '')).toBe(false)
    expect(normalizePracticeAnswer('{2; 3}')).toBe('2,3')
  })
})
