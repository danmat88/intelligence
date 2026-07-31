import { NATIVE_OFFICIAL_PAPERS, getNativeOfficialPaper } from '../content'

describe('arhiva oficială redactată nativ', () => {
  it('nu conține identificatori duplicați', () => {
    const paperIds = NATIVE_OFFICIAL_PAPERS.map((paper) => paper.id)
    expect(new Set(paperIds).size).toBe(paperIds.length)

    for (const paper of NATIVE_OFFICIAL_PAPERS) {
      const exerciseIds = paper.sections.flatMap((section) =>
        section.exercises.map((exercise) => exercise.id),
      )
      expect(new Set(exerciseIds).size).toBe(exerciseIds.length)
    }
  })

  it('fiecare lucrare are exact 100 de puncte', () => {
    for (const paper of NATIVE_OFFICIAL_PAPERS) {
      const exercisePoints = paper.sections
        .flatMap((section) => section.exercises)
        .reduce((total, exercise) => total + exercise.points, 0)
      expect(exercisePoints + paper.pointsFromOffice).toBe(100)
    }
  })

  it('fiecare exercițiu este complet pentru studiu și ghidare', () => {
    for (const paper of NATIVE_OFFICIAL_PAPERS) {
      for (const exercise of paper.sections.flatMap((section) => section.exercises)) {
        expect(exercise.prompt.trim()).not.toBe('')
        expect(exercise.expectedAnswer.trim()).not.toBe('')
        expect(exercise.hint.trim()).not.toBe('')
        expect(exercise.solution.length).toBeGreaterThan(0)

        if (exercise.options) {
          expect(exercise.options.some((option) => option.id === exercise.correctOption)).toBe(true)
        }
      }
    }
  })

  it('găsește lucrarea după identificator', () => {
    const paper = NATIVE_OFFICIAL_PAPERS[0]
    expect(getNativeOfficialPaper(paper.id, paper.profile)).toBe(paper)
  })

  it('fiecare figură nativă are descriere accesibilă și date valide', () => {
    for (const paper of NATIVE_OFFICIAL_PAPERS) {
      for (const exercise of paper.sections.flatMap((section) => section.exercises)) {
        if (!exercise.figure) continue
        expect(exercise.figureDescription?.trim()).toBeTruthy()
        if (exercise.figure.kind === 'bar-chart') {
          expect(exercise.figure.labels.length).toBe(exercise.figure.values.length)
          expect(exercise.figure.values.every((value) => value >= 0)).toBe(true)
        } else {
          expect(exercise.figure.points.length).toBeGreaterThanOrEqual(2)
          expect(exercise.figure.points.every((point) => point.position >= 0 && point.position <= 1)).toBe(true)
        }
      }
    }
  })
})
