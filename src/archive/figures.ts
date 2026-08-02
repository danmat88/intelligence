import type { OfficialExercise, OfficialFigureSpec } from './content'

type Sketch = Extract<OfficialFigureSpec, { kind: 'sketch' }>
type SketchPoint = Sketch['points'][number]
type SketchStroke = Sketch['strokes'][number]

const point = (
  id: string,
  x: number,
  y: number,
  label = id,
  labelDx?: number,
  labelDy?: number,
  showDot = true,
): SketchPoint => ({ id, label, x, y, labelDx, labelDy, showDot })

const guide = (id: string, x: number, y: number): SketchPoint => (
  { id, x, y, showDot: false }
)

const stroke = (...points: string[]): SketchStroke => ({ points })
const closed = (...points: string[]): SketchStroke => ({ points, closed: true })
const dashed = (...points: string[]): SketchStroke => ({ points, dashed: true })

const sketch = (
  points: SketchPoint[],
  strokes: SketchStroke[],
  extras: Pick<Sketch, 'circles' | 'ellipses'> = {},
): Sketch => ({ kind: 'sketch', points, strokes, ...extras })

const figures: Record<string, OfficialFigureSpec> = {}

function register(ids: string[], figure: OfficialFigureSpec) {
  for (const id of ids) figures[id] = figure
}

const axes = (
  graphStart: [number, number],
  graphEnd: [number, number],
  marks: SketchPoint[] = [],
): Sketch => sketch(
  [
    point('O', 118, 105, 'O', -9, 15),
    guide('x0', 18, 105), point('x', 263, 105, 'x', 0, -8, false),
    guide('y0', 118, 178), point('y', 118, 14, 'y', 10, 2, false),
    guide('gx1', graphStart[0], graphStart[1]), guide('gx2', graphEnd[0], graphEnd[1]),
    ...marks,
  ],
  [stroke('x0', 'x'), stroke('y0', 'y'), stroke('gx1', 'gx2')],
)

const cube = (extraPoints: SketchPoint[] = [], extraStrokes: SketchStroke[] = []): Sketch => sketch(
  [
    point('A', 38, 150, 'A', -9, 13), point('B', 145, 150, 'B', 8, 13),
    point('C', 218, 115, 'C', 10, 4), point('D', 108, 115, 'D', -9, 3),
    point('A1', 38, 62, "A'", -12, -7), point('B1', 145, 62, "B'", 10, -7),
    point('C1', 218, 27, "C'", 12, -5), point('D1', 108, 27, "D'", -12, -5),
    ...extraPoints,
  ],
  [
    closed('A', 'B', 'C', 'D'), closed('A1', 'B1', 'C1', 'D1'),
    stroke('A', 'A1'), stroke('B', 'B1'), stroke('C', 'C1'), dashed('D', 'D1'),
    ...extraStrokes,
  ],
)

const triangularPrism = (showMidpoint = false): Sketch => sketch(
  [
    point('A', 37, 144, 'A', -9, 12), point('B', 148, 151, 'B', 6, 14),
    point('C', 93, 103, 'C', -7, -9),
    point('A1', 85, 61, "A'", -11, -8), point('B1', 199, 67, "B'", 11, -7),
    point('C1', 144, 20, "C'", 3, -9),
    ...(showMidpoint ? [point('M', 92.5, 147.5, 'M', 0, 16)] : []),
  ],
  [
    closed('A', 'B', 'C'), closed('A1', 'B1', 'C1'),
    stroke('A', 'A1'), stroke('B', 'B1'), stroke('C', 'C1'),
  ],
)

// Evaluarea Națională 2022 — itemii cu figură.
register(['en22j-II-1'], {
  kind: 'segment',
  points: [{ label: 'C', position: 0 }, { label: 'A', position: 1 }, { label: 'B', position: 2 }, { label: 'D', position: 4 }],
  measures: [{ from: 'A', to: 'B', label: '10 cm' }],
})
register(['en22j-II-2'], sketch(
  [point('A', 35, 45), point('O', 140, 100), point('D', 245, 155), point('C', 35, 155), point('B', 245, 45)],
  [stroke('A', 'O', 'D'), stroke('C', 'O', 'B')],
))
register(['en22j-II-3'], sketch(
  [
    point('A', 25, 100), point('B', 140, 25), point('C', 250, 100), point('D', 140, 170),
    point('M', 195, 135), point('G', 158, 100),
  ],
  [closed('A', 'B', 'C', 'D'), stroke('A', 'C'), stroke('B', 'D'), stroke('B', 'M')],
))
register(['en22j-II-4'], sketch(
  [point('A', 35, 150), point('B', 240, 150), point('C', 155, 55), point('D', 35, 55)],
  [closed('A', 'B', 'C', 'D')],
))
register(['en22j-II-5'], sketch(
  [point('O', 140, 95), point('C', 70, 95), point('B', 210, 95), point('A', 170, 32)],
  [stroke('C', 'B'), stroke('A', 'B')],
  { circles: [{ center: 'O', radius: 70 }] },
))
register(['en22j-II-6'], sketch(
  [
    point('A', 35, 160), point('B', 145, 160), point('C', 225, 120), point('D', 110, 120),
    point('E', 35, 60), point('F', 145, 60), point('G', 225, 20), point('H', 110, 20),
  ],
  [closed('A', 'B', 'C', 'D'), closed('E', 'F', 'G', 'H'), stroke('A', 'E'), stroke('B', 'F'), stroke('C', 'G'), dashed('D', 'H'), dashed('A', 'G')],
))
register(['en22j-III-3b'], axes([45, 178], [220, 3], [
  point('A', 168, 105, 'A', 2, 16), point('B', 118, 155, 'B', -12, 2), point('C', 143, 130, 'C', 10, 3),
]))

const en22FivePoints = sketch(
  [point('A', 35, 55), point('B', 95, 20), point('C', 150, 55), point('D', 165, 105), point('E', 170, 175)],
  [stroke('A', 'B', 'D'), stroke('A', 'C', 'D'), stroke('A', 'D'), stroke('A', 'E'), stroke('C', 'E')],
)
register(['en22j-III-4a', 'en22j-III-4b'], en22FivePoints)

const en22Trapezoid = sketch(
  [
    point('A', 35, 160), point('R', 145, 160), point('B', 250, 160),
    point('D', 35, 90), point('C', 145, 90), point('T', 35, 15), point('O', 108, 113),
  ],
  [stroke('T', 'A', 'B'), stroke('T', 'B'), stroke('D', 'C'), stroke('D', 'R'), stroke('A', 'C'), stroke('T', 'R')],
)
register(['en22j-III-5a', 'en22j-III-5b'], en22Trapezoid)

const en22Prism = sketch(
  [
    point('A', 30, 145), point('B', 145, 175), point('C', 225, 140),
    point('D', 30, 45), point('E', 145, 75), point('F', 225, 40), point('M', 87.5, 160),
  ],
  [dashed('A', 'B', 'C', 'A'), closed('D', 'E', 'F'), stroke('A', 'D'), stroke('B', 'E'), stroke('C', 'F'), stroke('M', 'E'), stroke('M', 'C'), stroke('E', 'C')],
)
register(['en22j-III-6a', 'en22j-III-6b'], en22Prism)

// Evaluarea Națională 2023 — itemii cu figură.
register(['en23j-II-2'], sketch(
  [point('A', 28, 135), point('O', 125, 135), point('B', 248, 135), point('M', 72, 72), point('N', 125, 35)],
  [stroke('A', 'B'), stroke('O', 'M'), stroke('O', 'N')],
))
register(['en23j-II-3'], sketch(
  [point('A', 128, 25), point('B', 25, 155), point('M', 82, 155), point('C', 245, 155)],
  [closed('A', 'B', 'C'), stroke('A', 'M')],
))
register(['en23j-II-4'], sketch(
  [point('A', 55, 150), point('B', 210, 150), point('C', 210, 30), point('D', 55, 30)],
  [closed('A', 'B', 'C', 'D'), stroke('A', 'C')],
))
register(['en23j-II-5'], sketch(
  [
    point('O', 140, 95), point('A', 140, 25), point('B', 190, 45),
    point('C', 210, 95), point('D', 190, 145), point('E', 140, 165),
    point('F', 90, 145), point('G', 70, 95), point('H', 90, 45),
  ],
  [],
  { circles: [{ center: 'O', radius: 70 }] },
))
register(['en23j-II-6'], cube([], [dashed('B', 'D1')]))

const en23Function = axes([58, 165], [225, 23], [
  point('A', 205, 105, 'A', 3, 16), point('B', 118, 51, 'B', -11, 2),
  point('P', 118, 150, 'P', -11, 2),
])
register(['en23j-III-3a', 'en23j-III-3b'], en23Function)

const en23Trapezoid = sketch(
  [point('A', 35, 150), point('B', 235, 150), point('C', 185, 55), point('D', 35, 55)],
  [closed('A', 'B', 'C', 'D'), stroke('B', 'D')],
)
register(['en23j-III-4a', 'en23j-III-4b'], en23Trapezoid)

const en23Rectangle = sketch(
  [
    point('A', 35, 145), point('B', 210, 145), point('C', 210, 48), point('D', 35, 48),
    point('O', 122.5, 96.5), point('M', 122.5, 48, 'M', 0, -9),
    point('E', 210, 2, 'E', 10, 2), point('P', 68, 48, 'P', 0, -9),
    point('S', 90, 114, 'S', -10, 1),
  ],
  [closed('A', 'B', 'C', 'D'), stroke('A', 'C'), stroke('B', 'D'), stroke('A', 'E'), stroke('O', 'E')],
)
register(['en23j-III-5a', 'en23j-III-5b'], en23Rectangle)

const en23Cube = cube([], [stroke('A', 'B1'), stroke('B', 'C1'), stroke('D', 'C1'), stroke('D', 'B')])
register(['en23j-III-6a', 'en23j-III-6b'], en23Cube)

// Evaluarea Națională 2024.
register(['en24j-II-1'], {
  kind: 'segment',
  points: [{ label: 'A', position: 0 }, { label: 'B', position: 1 }, { label: 'C', position: 3 }, { label: 'D', position: 4 }],
})
register(['en24j-II-2'], sketch(
  [point('B', 36, 152), point('A', 127, 55), point('C', 225, 152), point('D', 178, 5)],
  [closed('A', 'B', 'C'), stroke('B', 'A', 'D')],
))
register(['en24j-II-3'], sketch(
  [
    point('A', 125, 23), point('B', 25, 155), point('C', 245, 155),
    point('N', 75, 89), point('M', 176, 89), point('P', 211, 155),
  ],
  [closed('A', 'B', 'C'), stroke('N', 'M'), stroke('M', 'P')],
))
register(['en24j-II-4'], sketch(
  [point('A', 40, 145), point('M', 103, 145), point('B', 166, 145), point('C', 235, 45), point('D', 108, 45)],
  [closed('A', 'B', 'C', 'D'), stroke('A', 'C'), stroke('M', 'C')],
))
register(['en24j-II-5'], sketch(
  [point('O', 140, 95), point('A', 70, 95), point('C', 210, 95), point('B', 105, 34)],
  [closed('A', 'B', 'C'), stroke('A', 'C')],
  { circles: [{ center: 'O', radius: 70 }] },
))
register(['en24j-II-6'], cube([], [stroke('A', 'C'), stroke('A1', 'D')]))

register(['en24j-III-3b'], axes([65, 175], [155, 14], [
  point('A', 142, 105, 'A', 3, 16), point('B', 118, 135, 'B', -11, 2),
  point('C', 94, 105, 'C', 0, 16),
]))

const en24Triangle = sketch(
  [
    point('A', 140, 18), point('B', 35, 160), point('C', 245, 160),
    point('D', 140, 160), point('E', 193, 89), point('H', 140, 107),
  ],
  [closed('A', 'B', 'C'), stroke('A', 'D'), stroke('B', 'E')],
)
register(['en24j-III-4a', 'en24j-III-4b'], en24Triangle)

const en24Circle = sketch(
  [
    point('O', 140, 95), point('C', 70, 95), point('D', 210, 95),
    point('B', 140, 25), point('M', 92, 44), point('N', 140, 70),
  ],
  [stroke('C', 'D'), stroke('O', 'B'), stroke('D', 'M')],
  { circles: [{ center: 'O', radius: 70 }] },
)
register(['en24j-III-5a', 'en24j-III-5b'], en24Circle)
register(['en24j-III-6a', 'en24j-III-6b'], triangularPrism(true))

// Evaluarea Națională 2025.
register(['en25j-II-2'], sketch(
  [point('O', 125, 142), point('A', 24, 142), point('B', 120, 38), point('M', 182, 67), point('C', 238, 115)],
  [stroke('O', 'A'), stroke('O', 'B'), stroke('O', 'M'), stroke('O', 'C')],
))
register(['en25j-II-3'], sketch(
  [point('A', 140, 100), point('B', 38, 40), point('C', 235, 155), point('E', 194, 131)],
  [closed('A', 'B', 'C'), stroke('A', 'E')],
))
register(['en25j-II-4'], sketch(
  [point('A', 35, 145), point('B', 235, 145), point('C', 235, 55), point('D', 35, 55)],
  [closed('A', 'B', 'C', 'D')],
))
register(['en25j-II-5'], sketch(
  [point('O', 140, 95), point('A', 140, 25), point('B', 79, 130), point('C', 201, 130), point('D', 140, 165)],
  [closed('A', 'B', 'C'), stroke('B', 'D', 'C')],
  { circles: [{ center: 'O', radius: 70 }] },
))
register(['en25j-II-6'], sketch(
  [point('V', 140, 17), point('A', 68, 145), point('B', 212, 145), point('O', 140, 145)],
  [closed('V', 'A', 'B'), dashed('V', 'O')],
  { ellipses: [{ center: 'O', radiusX: 72, radiusY: 20 }] },
))

const en25Function = axes([62, 176], [172, 13], [
  point('A', 166, 105, 'A', 3, 16), point('B', 118, 153, 'B', -12, 2),
  point('C', 70, 105, 'C', 0, 16),
])
register(['en25j-III-3a', 'en25j-III-3b'], en25Function)

const en25Square = sketch(
  [point('A', 45, 148), point('B', 202, 148), point('C', 202, 55), point('D', 45, 55), point('E', 46, 5)],
  [closed('A', 'B', 'C', 'D'), stroke('A', 'C'), stroke('A', 'E', 'C')],
)
register(['en25j-III-4a', 'en25j-III-4b'], en25Square)

const en25Trapezoid = sketch(
  [
    point('A', 30, 155), point('B', 245, 155), point('C', 154, 50), point('D', 30, 50),
    point('M', 92, 50), point('P', 76, 96),
  ],
  [closed('A', 'B', 'C', 'D'), stroke('A', 'M'), stroke('B', 'D')],
)
register(['en25j-III-5a', 'en25j-III-5b'], en25Trapezoid)

const en25Cube = cube(
  [point('O', 128, 132), point('E', 91.5, 106), point('F', 218, 71)],
  [stroke('A', 'C'), stroke('B', 'D'), stroke('A1', 'B'), stroke('A', 'B1'), stroke('F', 'O'), stroke('D', 'E')],
)
register(['en25j-III-6a', 'en25j-III-6b'], en25Cube)

// Evaluarea Națională 2026 — sesiunea iunie.
register(['en26j-II-2'], sketch(
  [point('A', 93, 86), point('B', 232, 38), point('C', 158, 145), point('D', 20, 174), point('E', 53, 28)],
  [stroke('E', 'A', 'C'), stroke('A', 'B'), stroke('D', 'C')],
))
register(['en26j-II-3'], sketch(
  [point('A', 140, 20), point('B', 25, 160), point('D', 140, 160), point('C', 250, 160), point('G', 140, 105)],
  [closed('A', 'B', 'C'), stroke('A', 'D'), stroke('C', 'G')],
))
register(['en26j-II-4'], sketch(
  [point('A', 35, 145), point('B', 170, 145), point('C', 235, 50), point('D', 100, 50)],
  [closed('A', 'B', 'C', 'D'), stroke('B', 'D')],
))
register(['en26j-II-5'], sketch(
  [point('O', 140, 95), point('A', 70, 95), point('B', 104, 34), point('C', 210, 95), point('D', 105, 157)],
  [stroke('A', 'B', 'C', 'D', 'A'), stroke('A', 'C'), stroke('B', 'D')],
  { circles: [{ center: 'O', radius: 70 }] },
))
register(['en26j-II-6'], sketch(
  [
    point('V', 140, 15), point('A', 42, 135), point('B', 120, 168),
    point('C', 237, 127), point('D', 158, 96), point('O', 139, 132),
  ],
  [closed('A', 'B', 'C', 'D'), stroke('V', 'A'), stroke('V', 'B'), stroke('V', 'C'), stroke('V', 'D'), dashed('V', 'O')],
))

const en26JuneFunction = axes([64, 176], [165, 13], [
  point('A', 166, 105, 'A', 3, 16), point('B', 118, 153, 'B', -12, 2), point('M', 142, 129, 'M', 10, 3),
])
register(['en26j-III-3a', 'en26j-III-3b'], en26JuneFunction)

const en26JuneCircle = sketch(
  [point('O', 140, 95), point('C', 70, 95), point('D', 210, 95), point('A', 175, 34), point('M', 175, 95), point('B', 175, 156)],
  [stroke('C', 'D'), stroke('A', 'B'), stroke('O', 'M'), stroke('A', 'C'), stroke('B', 'D')],
  { circles: [{ center: 'O', radius: 70 }] },
)
register(['en26j-III-4a', 'en26j-III-4b'], en26JuneCircle)

const en26JuneParallelogram = sketch(
  [
    point('A', 30, 150), point('T', 105, 150), point('B', 180, 150),
    point('M', 207, 97), point('C', 235, 45), point('N', 160, 45), point('D', 85, 45),
    point('Q', 143, 92),
  ],
  [closed('A', 'B', 'C', 'D'), stroke('A', 'M'), stroke('B', 'N')],
)
register(['en26j-III-5a', 'en26j-III-5b'], en26JuneParallelogram)

const en26JunePrism = cube([], [stroke('B', 'D'), stroke('C1', 'B'), stroke('C1', 'D')])
register(['en26j-III-6a', 'en26j-III-6b'], en26JunePrism)

// Evaluarea Națională 2026 — model oficial.
register(['en26m-II-2'], sketch(
  [point('A', 25, 145), point('O', 130, 145), point('B', 250, 145), point('M', 65, 60), point('C', 157, 45)],
  [stroke('A', 'B'), stroke('O', 'M'), stroke('O', 'C')],
))
register(['en26m-II-3'], sketch(
  [point('C', 55, 145), point('A', 55, 32), point('D', 96, 99), point('B', 235, 145)],
  [closed('A', 'B', 'C'), stroke('C', 'D')],
))
register(['en26m-II-4'], sketch(
  [
    point('A', 35, 150), point('E', 101, 150), point('B', 168, 150),
    point('C', 238, 45), point('D', 105, 45), point('F', 70, 97.5),
  ],
  [closed('A', 'B', 'C', 'D'), closed('A', 'E', 'F')],
))
register(['en26m-II-5'], sketch(
  [point('O', 140, 95), point('A', 70, 95), point('B', 210, 95), point('C', 160, 28), point('D', 120, 162)],
  [stroke('A', 'B'), stroke('C', 'D'), stroke('B', 'D')],
  { circles: [{ center: 'O', radius: 70 }] },
))
register(['en26m-II-6'], triangularPrism())

register(['en26m-III-3b'], axes([52, 164], [182, 12], [
  point('A', 70, 105, 'A', 0, 16), point('B', 118, 57, 'B', -12, 2), point('M', 190, 105, 'M', 0, 16),
]))

const en26ModelCircle = sketch(
  [point('O', 140, 95), point('A', 70, 95), point('B', 210, 95), point('C', 183, 40), point('D', 97, 40)],
  [stroke('A', 'B'), stroke('C', 'D'), stroke('A', 'C'), stroke('A', 'D'), stroke('B', 'C'), stroke('B', 'D')],
  { circles: [{ center: 'O', radius: 70 }] },
)
register(['en26m-III-4a', 'en26m-III-4b'], en26ModelCircle)

const en26ModelParallelogram = sketch(
  [
    point('A', 35, 145), point('M', 120, 145), point('B', 200, 145),
    point('C', 150, 55), point('D', 65, 55), point('N', 113, 5),
  ],
  [closed('A', 'B', 'C', 'D'), stroke('D', 'M', 'N'), stroke('C', 'N')],
)
register(['en26m-III-5a', 'en26m-III-5b'], en26ModelParallelogram)

const en26ModelCube = cube(
  [point('M', 73, 132.5), point('N', 163, 115), point('P', 108, 71)],
  [closed('M', 'N', 'P')],
)
register(['en26m-III-6a', 'en26m-III-6b'], en26ModelCube)

export function getOfficialFigure(exercise: OfficialExercise): OfficialFigureSpec | undefined {
  return exercise.figure ?? figures[exercise.id]
}

export const OFFICIAL_FIGURE_IDS = Object.freeze(Object.keys(figures))
