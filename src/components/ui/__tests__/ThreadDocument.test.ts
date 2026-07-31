import { normalizeDisplayedProblemText } from '../threadText'

describe('normalizeDisplayedProblemText', () => {
  it('keeps ordinary learner problems unchanged', () => {
    expect(normalizeDisplayedProblemText('Rezolvă ecuația x² - 5x + 6 = 0.')).toBe(
      'Rezolvă ecuația x² - 5x + 6 = 0.',
    )
  })

  it('extracts the enunț from legacy contextual-teacher prompts', () => {
    expect(normalizeDisplayedProblemText(
      [
        'Lucrez un subiect oficial de Evaluare Națională.',
        'Enunț: Calculează: 12 − 2 · 5.',
        'Ce am scris eu: Nu am început încă.',
        'Ajută-mă pedagogic în limba română.',
      ].join('\n'),
    )).toBe('Calculează: 12 − 2 · 5.')
  })
})
