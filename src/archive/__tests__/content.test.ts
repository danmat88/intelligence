import {
  NATIVE_OFFICIAL_PAPERS,
  OFFICIAL_SOURCE_PACKAGES,
  getNativeOfficialPaper,
} from '../content'
import { getOfficialFigure } from '../figures'
import katex from 'katex'

const exercises = NATIVE_OFFICIAL_PAPERS.flatMap((paper) => (
  paper.sections.flatMap((section) => section.exercises.map((exercise) => ({ paper, section, exercise })))
))

function mathFragments(value: string) {
  return [...value.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g)]
    .map((match) => match[1] ?? match[2])
}

describe('registrul conținutului oficial', () => {
  it('are sursă oficială verificată pentru EN și fiecare profil BAC', () => {
    expect(OFFICIAL_SOURCE_PACKAGES.filter((item) => item.exam === 'en').length).toBeGreaterThanOrEqual(2)
    for (const profile of ['mate_info', 'pedagogic', 'stiinte_naturii', 'tehnologic']) {
      expect(OFFICIAL_SOURCE_PACKAGES.some((item) => item.exam === 'bac' && item.profile === profile)).toBe(true)
    }
  })

  it('păstrează proveniența exactă și hashul arhivei', () => {
    for (const source of OFFICIAL_SOURCE_PACKAGES) {
      expect(source.sourceUrl).toMatch(/^https:\/\/(?:www\.)?subiecte\.edu\.ro\//)
      expect(source.sourceSha256s.length).toBeGreaterThan(0)
      for (const sha256 of source.sourceSha256s) {
        expect(sha256).toMatch(/^[A-F0-9]{64}$/)
      }
      expect(source.paperEntry).toMatch(/_var_.*\.pdf$/i)
      expect(source.markingSchemeEntry).toMatch(/_bar_.*\.pdf$/i)
      expect(['source_verified', 'interactive_verified']).toContain(source.status)
    }
  })

  it('publică lucrările EN numai după verificarea interactivă', () => {
    const model = getNativeOfficialPaper('en-2026-model')
    const june = getNativeOfficialPaper('en-2026-june')
    expect(model).not.toBeNull()
    expect(june).not.toBeNull()
    expect(model?.sections.flatMap((section) => section.exercises)).toHaveLength(24)
    expect(june?.sections.flatMap((section) => section.exercises)).toHaveLength(24)
    for (const id of ['en-2026-model', 'en-2026-june']) {
      expect(OFFICIAL_SOURCE_PACKAGES.find((source) => source.id === id)?.status)
        .toBe('interactive_verified')
    }
  })

  it('publică și separă modelul și examenul BAC pe toate cele patru profiluri', () => {
    for (const profile of ['mate_info', 'stiinte_naturii', 'tehnologic', 'pedagogic'] as const) {
      for (const kind of ['model', 'june'] as const) {
        const id = `bac-2026-${kind}-${profile}`
        const paper = getNativeOfficialPaper(id, profile)
        expect(paper).not.toBeNull()
        expect(paper?.sections.flatMap((section) => section.exercises)).toHaveLength(18)
        expect(OFFICIAL_SOURCE_PACKAGES.find((source) => source.id === id)?.status)
          .toBe('interactive_verified')
      }
    }
    expect(getNativeOfficialPaper('bac-2026-june-mate_info', 'tehnologic')).toBeNull()
  })

  it('publică examenul 2025 pentru EN și toate profilurile BAC', () => {
    expect(getNativeOfficialPaper('en-2025-june')).not.toBeNull()
    for (const profile of ['mate_info', 'stiinte_naturii', 'tehnologic', 'pedagogic'] as const) {
      const id = `bac-2025-june-${profile}`
      const paper = getNativeOfficialPaper(id, profile)
      expect(paper).not.toBeNull()
      expect(paper?.sections.flatMap((section) => section.exercises)).toHaveLength(18)
    }
  })

  it('publică examenul 2024 pentru EN și toate profilurile BAC', () => {
    const en = getNativeOfficialPaper('en-2024-june')
    expect(en).not.toBeNull()
    expect(en?.sections.flatMap((section) => section.exercises)).toHaveLength(24)
    for (const profile of ['mate_info', 'stiinte_naturii', 'tehnologic', 'pedagogic'] as const) {
      const id = `bac-2024-july-${profile}`
      const paper = getNativeOfficialPaper(id, profile)
      expect(paper).not.toBeNull()
      expect(paper?.sections.flatMap((section) => section.exercises)).toHaveLength(18)
      expect(paper?.session).toBe('Sesiunea iunie–iulie')
    }
  })

  it('publică examenul 2023 pentru EN și toate profilurile BAC', () => {
    const en = getNativeOfficialPaper('en-2023-june')
    expect(en).not.toBeNull()
    expect(en?.sections.flatMap((section) => section.exercises)).toHaveLength(24)
    for (const profile of ['mate_info', 'stiinte_naturii', 'tehnologic', 'pedagogic'] as const) {
      const id = `bac-2023-june-${profile}`
      const paper = getNativeOfficialPaper(id, profile)
      expect(paper).not.toBeNull()
      expect(paper?.sections.flatMap((section) => section.exercises)).toHaveLength(18)
    }
    expect(NATIVE_OFFICIAL_PAPERS).toHaveLength(30)
  })

  it('publică examenul EN 2022 numai după verificarea integrală', () => {
    const paper = getNativeOfficialPaper('en-2022-june')
    expect(paper).not.toBeNull()
    expect(paper?.sections.flatMap((section) => section.exercises)).toHaveLength(24)
    expect(OFFICIAL_SOURCE_PACKAGES.find((source) => source.id === 'en-2022-june')?.status)
      .toBe('interactive_verified')
  })

  it('publică examenul BAC 2022 pentru toate cele patru profiluri verificate', () => {
    for (const profile of ['mate_info', 'stiinte_naturii', 'tehnologic', 'pedagogic'] as const) {
      const id = `bac-2022-june-${profile}`
      const paper = getNativeOfficialPaper(id, profile)
      expect(paper).not.toBeNull()
      expect(paper?.sections.flatMap((section) => section.exercises)).toHaveLength(18)
      expect(OFFICIAL_SOURCE_PACKAGES.find((source) => source.id === id)?.status)
        .toBe('interactive_verified')
    }
  })

  it('impune contractul complet oricărei lucrări interactive viitoare', () => {
    for (const paper of NATIVE_OFFICIAL_PAPERS) {
      const source = OFFICIAL_SOURCE_PACKAGES.find((item) => item.id === paper.sourcePackageId)
      expect(source?.status).toBe('interactive_verified')
      const exerciseIds = paper.sections.flatMap((section) => section.exercises.map((exercise) => exercise.id))
      expect(new Set(exerciseIds).size).toBe(exerciseIds.length)
      const points = paper.sections.flatMap((section) => section.exercises)
        .reduce((total, exercise) => total + exercise.points, paper.pointsFromOffice)
      expect(points).toBe(100)
    }
  })

  it('nu acceptă identificatori duplicați sau câmpuri editoriale incomplete', () => {
    const ids = exercises.map(({ exercise }) => exercise.id)
    expect(new Set(ids).size).toBe(ids.length)

    for (const { paper, section, exercise } of exercises) {
      expect(paper.title.trim()).not.toBe('')
      expect(section.title.trim()).not.toBe('')
      expect(section.instructions.trim()).not.toBe('')
      expect(exercise.number.trim()).not.toBe('')
      expect(exercise.competency.trim()).not.toBe('')
      expect(exercise.prompt.trim()).not.toBe('')
      expect(exercise.expectedAnswer.trim()).not.toBe('')
      expect(exercise.hint.trim()).not.toBe('')
      expect(exercise.solution.length).toBeGreaterThan(0)
      for (const step of exercise.solution) expect(step.trim()).not.toBe('')
      expect(exercise).not.toHaveProperty('editorialIssue')
    }
  })

  it('respectă structura și punctajul fiecărui tip de subiect', () => {
    for (const paper of NATIVE_OFFICIAL_PAPERS) {
      expect(paper.sections).toHaveLength(3)
      for (const section of paper.sections) {
        expect(section.points).toBe(30)
        const expectedCount = paper.exam === 'en' && section.id === 'III' ? 12 : 6
        expect(section.exercises).toHaveLength(expectedCount)
        expect(section.exercises.reduce((total, exercise) => total + exercise.points, 0)).toBe(30)
      }
    }
  })

  it('validează toate exercițiile cu alegere multiplă', () => {
    for (const { exercise } of exercises) {
      if (!exercise.options) {
        expect(exercise.correctOption).toBeUndefined()
        continue
      }
      expect([2, 4]).toContain(exercise.options.length)
      expect(new Set(exercise.options.map((option) => option.id)).size).toBe(exercise.options.length)
      expect(exercise.options.every((option) => option.label.trim().length > 0)).toBe(true)
      expect(exercise.options.some((option) => option.id === exercise.correctOption)).toBe(true)
    }
  })

  it('compilează local fiecare formulă matematică', () => {
    for (const { exercise } of exercises) {
      const values = [
        exercise.prompt,
        exercise.expectedAnswer,
        exercise.hint,
        ...exercise.solution,
        ...(exercise.options?.map((option) => option.label) ?? []),
      ]
      for (const value of values) {
        expect(value.replace(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g, '')).not.toContain('$')
        for (const expression of mathFragments(value)) {
          expect(() => katex.renderToString(expression, { throwOnError: true, strict: 'ignore' })).not.toThrow()
        }
      }
    }
  })

  it('nu conține text corupt de o conversie greșită de encoding', () => {
    for (const { exercise } of exercises) {
      const value = JSON.stringify(exercise)
      expect(value).not.toMatch(/Ã.|È[™›]|Å[žŸ]|�/u)
    }
  })

  it('afișează nativ fiecare figură cerută de un exercițiu EN', () => {
    for (const { paper, exercise } of exercises) {
      if (paper.exam !== 'en' || !/figura alăturată/i.test(exercise.prompt)) continue
      expect(exercise.figureDescription).toBeTruthy()
      expect(getOfficialFigure(exercise)).toBeDefined()
    }
  })

  it('validează integritatea geometrică a fiecărei figuri native', () => {
    for (const { exercise } of exercises) {
      const figure = getOfficialFigure(exercise)
      if (!figure) continue
      if (figure.kind === 'bar-chart') {
        expect(figure.labels.length).toBe(figure.values.length)
        expect(figure.values.length).toBeGreaterThan(0)
        expect(figure.values.every((value) => value >= 0)).toBe(true)
        continue
      }
      if (figure.kind === 'segment') {
        expect(figure.points.length).toBeGreaterThanOrEqual(2)
        expect(new Set(figure.points.map((point) => point.label)).size).toBe(figure.points.length)
        expect(new Set(figure.points.map((point) => point.position)).size).toBeGreaterThanOrEqual(2)
        continue
      }

      const pointIds = new Set(figure.points.map((point) => point.id))
      expect(pointIds.size).toBe(figure.points.length)
      for (const point of figure.points) {
        expect(point.x).toBeGreaterThanOrEqual(0)
        expect(point.x).toBeLessThanOrEqual(280)
        expect(point.y).toBeGreaterThanOrEqual(0)
        expect(point.y).toBeLessThanOrEqual(190)
      }
      for (const line of figure.strokes) {
        expect(line.points.length).toBeGreaterThanOrEqual(2)
        expect(line.points.every((id) => pointIds.has(id))).toBe(true)
      }
      for (const circle of figure.circles ?? []) {
        expect(pointIds.has(circle.center)).toBe(true)
        expect(circle.radius).toBeGreaterThan(0)
      }
      for (const ellipse of figure.ellipses ?? []) {
        expect(pointIds.has(ellipse.center)).toBe(true)
        expect(ellipse.radiusX).toBeGreaterThan(0)
        expect(ellipse.radiusY).toBeGreaterThan(0)
      }
    }
  })
})
