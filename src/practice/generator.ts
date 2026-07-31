import type { PracticeExam, PracticeExercise, PracticeSet } from './catalog'

export type PracticeChapter =
  | 'mixt'
  | 'numere'
  | 'algebra'
  | 'geometrie'
  | 'analiza'
  | 'probabilitati'

export type PracticeConfig = {
  chapter: PracticeChapter
  count: 5 | 10 | 15
  seed: number
}

export const CHAPTERS: Record<PracticeExam, Array<{ id: PracticeChapter; label: string; detail: string }>> = {
  en: [
    { id: 'mixt', label: 'Mixt', detail: 'Toată programa' },
    { id: 'numere', label: 'Numere', detail: 'Calcul, fracții, procente' },
    { id: 'algebra', label: 'Algebră', detail: 'Ecuații și expresii' },
    { id: 'geometrie', label: 'Geometrie', detail: 'Figuri plane și măsurători' },
  ],
  bac: [
    { id: 'mixt', label: 'Mixt', detail: 'Subiectele I–III' },
    { id: 'algebra', label: 'Algebră', detail: 'Ecuații, matrice, progresii' },
    { id: 'analiza', label: 'Analiză', detail: 'Limite, derivate, integrale' },
    { id: 'probabilitati', label: 'Probabilități', detail: 'Numărare și probabilități' },
  ],
}

const positiveMod = (value: number, modulo: number) => ((value % modulo) + modulo) % modulo

function randomAt(seed: number, index: number, salt = 0): number {
  let value = (seed + index * 374761393 + salt * 668265263) | 0
  value = Math.imul(value ^ (value >>> 13), 1274126177)
  return (value ^ (value >>> 16)) >>> 0
}

const pick = (seed: number, index: number, minimum: number, span: number, salt = 0) =>
  minimum + positiveMod(randomAt(seed, index, salt), span)

function enNumber(seed: number, index: number): PracticeExercise {
  const base = pick(seed, index, 80, 321)
  const percent = [5, 10, 15, 20, 25, 40, 50][pick(seed, index, 0, 7, 1)]
  const result = (base * percent) / 100
  const adjustedBase = Number.isInteger(result) ? base : base * 20
  const adjustedResult = (adjustedBase * percent) / 100
  return {
    id: `generated-en-numere-${seed}-${index}`,
    competency: 'Procente și proporții',
    prompt: `Calculează ${percent}% din ${adjustedBase}.`,
    answerLabel: 'Rezultatul',
    accepted: [`${adjustedResult}`, `${String(adjustedResult).replace('.', ',')}`],
    hint: `Scrie ${percent}% ca fracția ${percent}/100 și înmulțește cu ${adjustedBase}.`,
    explanation: `${adjustedBase} · ${percent}/100 = ${adjustedResult}.`,
  }
}

function enAlgebra(seed: number, index: number): PracticeExercise {
  const a = pick(seed, index, 2, 8)
  const solution = pick(seed, index, -6, 18, 1)
  const b = pick(seed, index, -9, 19, 2)
  const right = a * solution + b
  const sign = b < 0 ? `− ${Math.abs(b)}` : `+ ${b}`
  return {
    id: `generated-en-algebra-${seed}-${index}`,
    competency: 'Ecuații de gradul I',
    prompt: `Rezolvă ecuația ${a}x ${sign} = ${right}.`,
    answerLabel: 'x =',
    accepted: [`${solution}`, `x=${solution}`],
    hint: `Izolează termenul ${a}x, apoi împarte ambii membri la ${a}.`,
    explanation: `${a}x ${sign} = ${right} ⇒ ${a}x = ${right - b} ⇒ x = ${solution}.`,
  }
}

function enGeometry(seed: number, index: number): PracticeExercise {
  const length = pick(seed, index, 4, 13)
  const width = pick(seed, index, 3, 10, 1)
  const area = length * width
  return {
    id: `generated-en-geometrie-${seed}-${index}`,
    competency: 'Geometrie plană',
    prompt: `Un dreptunghi are lungimea de ${length} cm și lățimea de ${width} cm. Calculează aria.`,
    answerLabel: 'Aria',
    accepted: [`${area}`, `${area}cm2`, `${area}cm²`, `a=${area}cm²`],
    hint: 'Aria dreptunghiului este produsul dintre lungime și lățime.',
    explanation: `A = ${length} · ${width} = ${area} cm².`,
  }
}

function bacAlgebra(seed: number, index: number): PracticeExercise {
  const first = pick(seed, index, -4, 12)
  let second = pick(seed, index, -3, 13, 1)
  if (second === first) second += 2
  const sum = first + second
  const product = first * second
  const middle = -sum
  const signMiddle = middle < 0 ? `− ${Math.abs(middle)}x` : `+ ${middle}x`
  const signProduct = product < 0 ? `− ${Math.abs(product)}` : `+ ${product}`
  return {
    id: `generated-bac-algebra-${seed}-${index}`,
    competency: 'Ecuații de gradul al II-lea',
    prompt: `Rezolvă în ℝ ecuația x² ${signMiddle} ${signProduct} = 0.`,
    answerLabel: 'Soluțiile',
    accepted: [
      `${first},${second}`,
      `${second},${first}`,
      `{${first},${second}}`,
      `{${second},${first}}`,
    ],
    hint: `Caută două numere cu suma ${sum} și produsul ${product}.`,
    explanation: `Ecuația se scrie (x − (${first}))(x − (${second})) = 0, deci x ∈ {${first}, ${second}}.`,
  }
}

function bacAnalysis(seed: number, index: number): PracticeExercise {
  const a = pick(seed, index, 2, 8)
  const b = pick(seed, index, -8, 17, 1)
  const c = pick(seed, index, -6, 13, 2)
  const signB = b < 0 ? `− ${Math.abs(b)}x` : `+ ${b}x`
  const signC = c < 0 ? `− ${Math.abs(c)}` : `+ ${c}`
  const derivativeB = b < 0 ? `− ${Math.abs(b)}` : `+ ${b}`
  return {
    id: `generated-bac-analiza-${seed}-${index}`,
    competency: 'Derivate',
    prompt: `Determină derivata funcției f(x) = ${a}x² ${signB} ${signC}.`,
    answerLabel: "f'(x) =",
    accepted: [`${2 * a}x${b < 0 ? b : `+${b}`}`, `${2 * a}x${derivativeB}`],
    hint: 'Aplică (x²)′ = 2x, (x)′ = 1 și derivata constantei egală cu 0.',
    explanation: `f'(x) = ${2 * a}x ${derivativeB}.`,
  }
}

function bacProbability(seed: number, index: number): PracticeExercise {
  const total = [6, 8, 10, 12][pick(seed, index, 0, 4)]
  const favorable = pick(seed, index, 1, total - 1, 1)
  const divisor = gcd(favorable, total)
  const numerator = favorable / divisor
  const denominator = total / divisor
  return {
    id: `generated-bac-probabilitati-${seed}-${index}`,
    competency: 'Probabilități',
    prompt: `Dintr-o mulțime cu ${total} rezultate egal posibile, ${favorable} sunt favorabile. Calculează probabilitatea.`,
    answerLabel: 'Probabilitatea',
    accepted: [`${numerator}/${denominator}`, `${favorable}/${total}`, `${favorable / total}`],
    hint: 'Probabilitatea este numărul cazurilor favorabile împărțit la numărul cazurilor posibile.',
    explanation: `P = ${favorable}/${total} = ${numerator}/${denominator}.`,
  }
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y) [x, y] = [y, x % y]
  return x || 1
}

function chapterFor(exam: PracticeExam, chapter: PracticeChapter, index: number): PracticeChapter {
  if (chapter !== 'mixt') return chapter
  const chapters: PracticeChapter[] =
    exam === 'en' ? ['numere', 'algebra', 'geometrie'] : ['algebra', 'analiza', 'probabilitati']
  return chapters[index % chapters.length]
}

export function buildConfiguredSet(exam: PracticeExam, config: PracticeConfig): PracticeSet {
  const exercises = Array.from({ length: config.count }, (_, index) => {
    const chapter = chapterFor(exam, config.chapter, index)
    if (exam === 'en') {
      if (chapter === 'numere') return enNumber(config.seed, index)
      if (chapter === 'geometrie') return enGeometry(config.seed, index)
      return enAlgebra(config.seed, index)
    }
    if (chapter === 'analiza') return bacAnalysis(config.seed, index)
    if (chapter === 'probabilitati') return bacProbability(config.seed, index)
    return bacAlgebra(config.seed, index)
  })
  const label = CHAPTERS[exam].find((chapter) => chapter.id === config.chapter)?.label ?? 'Mixt'
  return {
    id: `configured-${exam}-${config.chapter}-${config.count}-${config.seed}`,
    exam,
    title: config.chapter === 'mixt' ? 'Test personalizat' : label,
    subtitle: `${label} · set generat și verificat`,
    duration: `aprox. ${Math.max(5, Math.round(config.count * 1.5))} minute`,
    exercises,
  }
}

export function configuredSetFromId(setId: string): PracticeSet | null {
  const match = /^configured-(en|bac)-([a-z]+)-(5|10|15)-(\d+)$/.exec(setId)
  if (!match) return null
  const [, exam, chapter, count, seed] = match
  const validChapter = CHAPTERS[exam as PracticeExam].some((item) => item.id === chapter)
  if (!validChapter) return null
  return buildConfiguredSet(exam as PracticeExam, {
    chapter: chapter as PracticeChapter,
    count: Number(count) as 5 | 10 | 15,
    seed: Number(seed),
  })
}
