export type PracticeExam = 'en' | 'bac'

export type PracticeExercise = {
  id: string
  competency: string
  prompt: string
  answerLabel: string
  accepted: string[]
  hint: string
  explanation: string
}

export type PracticeSet = {
  id: string
  exam: PracticeExam
  title: string
  subtitle: string
  duration: string
  exercises: PracticeExercise[]
}

const normalize = (value: string) =>
  value
    .toLocaleLowerCase('ro-RO')
    .replace(/[−–—]/g, '-')
    .replace(/\s+/g, '')
    .replace(/;/g, ',')

export function answerMatches(exercise: PracticeExercise, value: string): boolean {
  const candidate = normalize(value)
  return exercise.accepted.some((answer) => normalize(answer) === candidate)
}

export const PRACTICE_SETS: Record<PracticeExam, PracticeSet> = {
  en: {
    id: 'en-diagnostic-fundamente-1',
    exam: 'en',
    title: 'Diagnostic de bază',
    subtitle: 'Numere, ecuații și geometrie',
    duration: 'aprox. 8 minute',
    exercises: [
      {
        id: 'en-fractii-1',
        competency: 'Numere raționale',
        prompt: 'Calculează și simplifică: 3/4 + 5/8.',
        answerLabel: 'Rezultatul',
        accepted: ['11/8', '1 3/8', '1,375', '1.375'],
        hint: 'Adu fracțiile la același numitor. 3/4 este egal cu 6/8.',
        explanation: '3/4 = 6/8, deci 6/8 + 5/8 = 11/8 = 1 3/8.',
      },
      {
        id: 'en-ecuatie-1',
        competency: 'Ecuații',
        prompt: 'Rezolvă ecuația: 2x − 7 = 9.',
        answerLabel: 'x =',
        accepted: ['8', 'x=8'],
        hint: 'Adună 7 în ambii membri, apoi împarte la 2.',
        explanation: '2x − 7 = 9 ⇒ 2x = 16 ⇒ x = 8.',
      },
      {
        id: 'en-pitagora-1',
        competency: 'Geometrie',
        prompt: 'Un triunghi dreptunghic are catetele de 6 cm și 8 cm. Află ipotenuza.',
        answerLabel: 'Ipotenuza',
        accepted: ['10', '10cm', 'c=10', 'c=10cm'],
        hint: 'Folosește teorema lui Pitagora: c² = 6² + 8².',
        explanation: 'c² = 36 + 64 = 100, iar c este pozitiv, deci c = 10 cm.',
      },
    ],
  },
  bac: {
    id: 'bac-diagnostic-fundamente-1',
    exam: 'bac',
    title: 'Diagnostic de bază',
    subtitle: 'Algebră și analiză elementară',
    duration: 'aprox. 10 minute',
    exercises: [
      {
        id: 'bac-ecuatie-grad2-1',
        competency: 'Ecuații de gradul al II-lea',
        prompt: 'Rezolvă în ℝ ecuația: x² − 5x + 6 = 0.',
        answerLabel: 'Soluțiile',
        accepted: ['2,3', '3,2', '{2,3}', 'x1=2,x2=3', 'x=2,x=3'],
        hint: 'Caută două numere cu produsul 6 și suma 5.',
        explanation: 'x² − 5x + 6 = (x − 2)(x − 3), deci soluțiile sunt 2 și 3.',
      },
      {
        id: 'bac-derivata-1',
        competency: 'Derivate',
        prompt: 'Determină derivata funcției f(x) = 3x² − 4x + 1.',
        answerLabel: "f'(x) =",
        accepted: ['6x-4', "f'(x)=6x-4", '6*x-4'],
        hint: 'Derivata lui ax² este 2ax, iar derivata unei constante este 0.',
        explanation: "f'(x) = 6x − 4.",
      },
      {
        id: 'bac-logaritmi-1',
        competency: 'Logaritmi',
        prompt: 'Calculează log₂32.',
        answerLabel: 'Rezultatul',
        accepted: ['5', 'log2(32)=5'],
        hint: 'Întreabă-te la ce putere trebuie ridicat 2 pentru a obține 32.',
        explanation: '2⁵ = 32, deci log₂32 = 5.',
      },
    ],
  },
}

const EN_QUICK: PracticeSet = {
  id: 'en-set-rapid-1',
  exam: 'en',
  title: 'Set rapid',
  subtitle: 'Calcul și măsurători',
  duration: 'aprox. 6 minute',
  exercises: [
    {
      id: 'en-radical-1',
      competency: 'Radicali',
      prompt: 'Calculează √144.',
      answerLabel: 'Rezultatul',
      accepted: ['12', '√144=12'],
      hint: 'Caută numărul pozitiv al cărui pătrat este 144.',
      explanation: '12² = 144, deci √144 = 12.',
    },
    {
      id: 'en-procente-1',
      competency: 'Procente',
      prompt: 'Calculează 15% din 240.',
      answerLabel: 'Rezultatul',
      accepted: ['36', '36lei', '36 de lei'],
      hint: '15% = 15/100. Înmulțește 240 cu 15/100.',
      explanation: '240 · 15/100 = 2,4 · 15 = 36.',
    },
    {
      id: 'en-arie-dreptunghi-1',
      competency: 'Geometrie plană',
      prompt: 'Un dreptunghi are lungimea de 7 cm și lățimea de 5 cm. Calculează aria.',
      answerLabel: 'Aria',
      accepted: ['35', '35cm2', '35cm²', 'a=35cm2', 'a=35cm²'],
      hint: 'Aria dreptunghiului este lungime × lățime.',
      explanation: 'A = 7 · 5 = 35 cm².',
    },
  ],
}

const EN_SIMULATION: PracticeSet = {
  id: 'en-test-mixt-1',
  exam: 'en',
  title: 'Test mixt',
  subtitle: 'Set mixt · nivel introductiv',
  duration: 'aprox. 12 minute',
  exercises: [
    {
      id: 'en-puteri-1',
      competency: 'Puteri',
      prompt: 'Calculează 2³ · 2⁴.',
      answerLabel: 'Rezultatul',
      accepted: ['128', '2^7', '2⁷'],
      hint: 'La înmulțirea puterilor cu aceeași bază, adună exponenții.',
      explanation: '2³ · 2⁴ = 2³⁺⁴ = 2⁷ = 128.',
    },
    {
      id: 'en-ecuatie-paranteze-1',
      competency: 'Ecuații',
      prompt: 'Rezolvă ecuația 3(x − 2) = 15.',
      answerLabel: 'x =',
      accepted: ['7', 'x=7'],
      hint: 'Împarte mai întâi ambii membri la 3.',
      explanation: '3(x − 2) = 15 ⇒ x − 2 = 5 ⇒ x = 7.',
    },
    {
      id: 'en-aria-cerc-1',
      competency: 'Geometrie plană',
      prompt: 'Un cerc are raza de 4 cm. Exprimă aria exactă.',
      answerLabel: 'Aria',
      accepted: ['16π', '16pi', '16*pi', 'a=16π', '16πcm2', '16πcm²'],
      hint: 'Folosește formula A = πr².',
      explanation: 'A = π · 4² = 16π cm².',
    },
  ],
}

const BAC_QUICK: PracticeSet = {
  id: 'bac-set-rapid-1',
  exam: 'bac',
  title: 'Set rapid',
  subtitle: 'Algebră și analiză',
  duration: 'aprox. 7 minute',
  exercises: [
    {
      id: 'bac-progresie-1',
      competency: 'Progresii aritmetice',
      prompt: 'O progresie aritmetică are a₁ = 3 și rația r = 4. Calculează a₅.',
      answerLabel: 'a₅ =',
      accepted: ['19', 'a5=19', 'a₅=19'],
      hint: 'Folosește formula aₙ = a₁ + (n − 1)r.',
      explanation: 'a₅ = 3 + (5 − 1) · 4 = 3 + 16 = 19.',
    },
    {
      id: 'bac-determinant-1',
      competency: 'Matrice',
      prompt: 'Calculează determinantul matricei cu liniile (2, 1) și (3, 4).',
      answerLabel: 'Determinantul',
      accepted: ['5', 'det=5'],
      hint: 'Pentru o matrice 2×2, determinantul este ad − bc.',
      explanation: 'det = 2 · 4 − 1 · 3 = 8 − 3 = 5.',
    },
    {
      id: 'bac-integrala-1',
      competency: 'Integrale',
      prompt: 'Calculează ∫₀³ 2x dx.',
      answerLabel: 'Rezultatul',
      accepted: ['9', '9u', '=9'],
      hint: 'O primitivă a lui 2x este x².',
      explanation: '∫₀³ 2x dx = [x²]₀³ = 9 − 0 = 9.',
    },
  ],
}

const BAC_SIMULATION: PracticeSet = {
  id: 'bac-test-mixt-1',
  exam: 'bac',
  title: 'Test mixt',
  subtitle: 'Set mixt · nivel introductiv',
  duration: 'aprox. 14 minute',
  exercises: [
    {
      id: 'bac-domeniu-log-1',
      competency: 'Funcții',
      prompt: 'Determină domeniul funcției f(x) = ln(x − 2).',
      answerLabel: 'Domeniul',
      accepted: ['(2,∞)', '(2,+∞)', 'x>2', 'd=(2,∞)', 'd=(2,+∞)'],
      hint: 'Argumentul logaritmului trebuie să fie strict pozitiv.',
      explanation: 'x − 2 > 0 ⇒ x > 2, deci Df = (2, +∞).',
    },
    {
      id: 'bac-limita-1',
      competency: 'Limite',
      prompt: 'Calculează limita pentru x → 1 a expresiei (x² − 1)/(x − 1).',
      answerLabel: 'Limita',
      accepted: ['2', 'lim=2'],
      hint: 'Factorizează x² − 1 = (x − 1)(x + 1).',
      explanation: 'Pentru x ≠ 1, raportul este x + 1. Limita este 1 + 1 = 2.',
    },
    {
      id: 'bac-probabilitate-1',
      competency: 'Probabilități',
      prompt: 'Se aruncă un zar corect. Care este probabilitatea obținerii unui număr par?',
      answerLabel: 'Probabilitatea',
      accepted: ['1/2', '0,5', '0.5', '50%'],
      hint: 'Numără rezultatele pare și împarte la numărul total de rezultate.',
      explanation: 'Rezultatele pare sunt 2, 4 și 6: 3 cazuri din 6, deci P = 3/6 = 1/2.',
    },
  ],
}

export const PRACTICE_LIBRARY: Record<PracticeExam, PracticeSet[]> = {
  en: [PRACTICE_SETS.en, EN_QUICK, EN_SIMULATION],
  bac: [PRACTICE_SETS.bac, BAC_QUICK, BAC_SIMULATION],
}

export function getPracticeSet(exam: PracticeExam, setId?: string): PracticeSet {
  return PRACTICE_LIBRARY[exam].find((set) => set.id === setId) ?? PRACTICE_LIBRARY[exam][0]
}

export function findPracticeExercise(exerciseId: string, configuredSet?: PracticeSet | null) {
  const configuredExercise = configuredSet?.exercises.find((item) => item.id === exerciseId)
  if (configuredExercise && configuredSet) return { set: configuredSet, exercise: configuredExercise }
  for (const sets of Object.values(PRACTICE_LIBRARY)) {
    for (const set of sets) {
      const exercise = set.exercises.find((item) => item.id === exerciseId)
      if (exercise) return { set, exercise }
    }
  }
  return null
}
