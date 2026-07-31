import type { ArchiveExam } from './catalog'

export type OfficialExercise = {
  id: string
  number: string
  points: number
  competency: string
  prompt: string
  options?: Array<{ id: string; label: string }>
  correctOption?: string
  expectedAnswer: string
  hint: string
  solution: string[]
  figureDescription?: string
  figure?: OfficialFigureSpec
}

export type OfficialFigureSpec =
  | {
      kind: 'bar-chart'
      labels: string[]
      values: number[]
      highlightIndex?: number
    }
  | {
      kind: 'segment'
      points: Array<{ label: string; position: number }>
      measures?: Array<{ from: string; to: string; label: string }>
    }

export type OfficialSection = {
  id: string
  title: string
  instructions: string
  points: number
  exercises: OfficialExercise[]
}

export type NativeOfficialPaper = {
  id: string
  exam: ArchiveExam
  year: number
  session: string
  profile?: string
  title: string
  durationMinutes: number
  pointsFromOffice: number
  sourceUrl: string
  sections: OfficialSection[]
}

const en2026Main: NativeOfficialPaper = {
  id: 'en-en-viii-2026-matematica-zip',
  exam: 'en',
  year: 2026,
  session: 'Sesiunea principală',
  title: 'Evaluarea Națională · Matematică',
  durationMinutes: 120,
  pointsFromOffice: 10,
  sourceUrl: 'https://subiecte.edu.ro/2026/evaluarenationala/Subiecte_si_bareme/EN_VIII_2026_Matematica.zip',
  sections: [
    {
      id: 's1',
      title: 'Subiectul I',
      instructions: 'Alege răspunsul corect.',
      points: 30,
      exercises: [
        {
          id: 's1-1',
          number: '1',
          points: 5,
          competency: 'Ordinea operațiilor',
          prompt: 'Calculează: 12 − 2 · 5.',
          options: [['a', '50'], ['b', '22'], ['c', '2'], ['d', '0']].map(([id, label]) => ({ id, label })),
          correctOption: 'c',
          expectedAnswer: '2',
          hint: 'Efectuează înmulțirea înaintea scăderii.',
          solution: ['2 · 5 = 10', '12 − 10 = 2'],
        },
        {
          id: 's1-2',
          number: '2',
          points: 5,
          competency: 'Procente',
          prompt: 'Dintre cei 250 de elevi participanți la un concurs, 40% sunt băieți. Câți băieți participă?',
          options: [['a', '150'], ['b', '125'], ['c', '100'], ['d', '90']].map(([id, label]) => ({ id, label })),
          correctOption: 'c',
          expectedAnswer: '100',
          hint: 'Calculează 40/100 din 250.',
          solution: ['40% · 250 = 0,4 · 250', '0,4 · 250 = 100'],
        },
        {
          id: 's1-3',
          number: '3',
          points: 5,
          competency: 'Numere întregi',
          prompt: 'Suma dintre numărul 10 și opusul numărului 10 este:',
          options: [['a', '101/10'], ['b', '11/10'], ['c', '1'], ['d', '0']].map(([id, label]) => ({ id, label })),
          correctOption: 'd',
          expectedAnswer: '0',
          hint: 'Opusul lui 10 este −10.',
          solution: ['10 + (−10) = 0'],
        },
        {
          id: 's1-4',
          number: '4',
          points: 5,
          competency: 'Fracții periodice',
          prompt: 'Transformă fracția zecimală periodică 1,(2) în fracție ordinară.',
          options: [['a', '11/10'], ['b', '6/5'], ['c', '11/9'], ['d', '4/3']].map(([id, label]) => ({ id, label })),
          correctOption: 'c',
          expectedAnswer: '11/9',
          hint: 'Notează x = 1,(2), apoi scade x din 10x.',
          solution: ['x = 1,(2)', '10x = 12,(2)', '9x = 11, deci x = 11/9'],
        },
        {
          id: 's1-5',
          number: '5',
          points: 5,
          competency: 'Proporții',
          prompt: 'Din proporția (√5 − 1)/2 = x/(√5 + 1), patru elevi obțin: Ioana 1, Andreea 2, Luca 3, Radu 4. Cine a răspuns corect?',
          options: [['a', 'Ioana'], ['b', 'Andreea'], ['c', 'Luca'], ['d', 'Radu']].map(([id, label]) => ({ id, label })),
          correctOption: 'b',
          expectedAnswer: 'Andreea; x = 2',
          hint: 'Înmulțește în cruce și folosește (√5 − 1)(√5 + 1) = 4.',
          solution: ['x = ((√5 − 1)(√5 + 1))/2', 'x = (5 − 1)/2 = 2', 'Răspunsul corect este al Andreei.'],
        },
        {
          id: 's1-6',
          number: '6',
          points: 5,
          competency: 'Citirea diagramelor',
          prompt: 'O diagramă arată numărul de mașini vândute în ianuarie, februarie, martie și aprilie. Bara pentru martie este cea mai mică. Afirmația „Cele mai puține mașini au fost vândute în martie” este:',
          options: [['a', 'adevărată'], ['b', 'falsă']].map(([id, label]) => ({ id, label })),
          correctOption: 'a',
          expectedAnswer: 'adevărată',
          hint: 'Compară înălțimea celor patru bare.',
          solution: ['Bara lunii martie are cea mai mică înălțime.', 'Afirmația este adevărată.'],
          figureDescription: 'Diagramă cu bare pentru lunile ianuarie–aprilie; martie are valoarea minimă.',
          figure: {
            kind: 'bar-chart',
            labels: ['Ian.', 'Feb.', 'Mar.', 'Apr.'],
            values: [7, 5, 2, 8],
            highlightIndex: 2,
          },
        },
      ],
    },
    {
      id: 's2',
      title: 'Subiectul al II-lea',
      instructions: 'Alege răspunsul corect.',
      points: 30,
      exercises: [
        {
          id: 's2-1',
          number: '1',
          points: 5,
          competency: 'Segmente',
          prompt: 'Punctele A, B, C și D sunt coliniare în această ordine. AB = 1 cm, AD = 6 cm, iar C este mijlocul lui AD. Calculează BC.',
          options: [['a', '5 cm'], ['b', '3 cm'], ['c', '2 cm'], ['d', '1 cm']].map(([id, label]) => ({ id, label })),
          correctOption: 'c',
          expectedAnswer: '2 cm',
          hint: 'Mai întâi află AC.',
          solution: ['AC = AD/2 = 3 cm', 'BC = AC − AB = 3 − 1 = 2 cm'],
          figureDescription: 'A—B——C———D, cu AB = 1 cm și AD = 6 cm.',
          figure: {
            kind: 'segment',
            points: [
              { label: 'A', position: 0 },
              { label: 'B', position: 1 / 6 },
              { label: 'C', position: 1 / 2 },
              { label: 'D', position: 1 },
            ],
            measures: [
              { from: 'A', to: 'B', label: '1 cm' },
              { from: 'A', to: 'D', label: '6 cm' },
            ],
          },
        },
        {
          id: 's2-2',
          number: '2',
          points: 5,
          competency: 'Drepte paralele',
          prompt: 'AB ∥ CD. Punctele E, A, C sunt coliniare, iar B și D sunt de părți opuse ale dreptei AC. Dacă ∠DCA = 80°, determină ∠EAB.',
          options: [['a', '110°'], ['b', '100°'], ['c', '90°'], ['d', '80°']].map(([id, label]) => ({ id, label })),
          correctOption: 'b',
          expectedAnswer: '100°',
          hint: 'Folosește unghiurile formate de o secantă cu două drepte paralele și unghiurile suplimentare.',
          solution: ['Unghiul corespunzător lui ∠DCA are 80°.', '∠EAB este suplimentar cu acesta.', '∠EAB = 180° − 80° = 100°.'],
        },
        {
          id: 's2-3',
          number: '3',
          points: 5,
          competency: 'Centrul de greutate',
          prompt: 'În triunghiul ABC, D este mijlocul lui BC, iar G este centrul de greutate. Dacă aria triunghiului DGC este 15 cm², află aria triunghiului ABC.',
          options: [['a', '30 cm²'], ['b', '45 cm²'], ['c', '60 cm²'], ['d', '90 cm²']].map(([id, label]) => ({ id, label })),
          correctOption: 'd',
          expectedAnswer: '90 cm²',
          hint: 'Mediana AD împarte triunghiul în două arii egale, iar G împarte mediana în raport 2:1.',
          solution: ['Aria lui DGC este 1/6 din aria lui ABC.', 'A(ABC) = 6 · 15 = 90 cm².'],
        },
        {
          id: 's2-4',
          number: '4',
          points: 5,
          competency: 'Aria paralelogramului',
          prompt: 'În paralelogramul ABCD, diagonala BD este perpendiculară pe BC și BD · BC = 12 cm². Află aria paralelogramului.',
          options: [['a', '6 cm²'], ['b', '12 cm²'], ['c', '18 cm²'], ['d', '24 cm²']].map(([id, label]) => ({ id, label })),
          correctOption: 'b',
          expectedAnswer: '12 cm²',
          hint: 'Diagonala împarte paralelogramul în două triunghiuri congruente.',
          solution: ['A(BCD) = BD · BC / 2 = 6 cm²', 'A(ABCD) = 2 · 6 = 12 cm²'],
        },
        {
          id: 's2-5',
          number: '5',
          points: 5,
          competency: 'Unghiuri în cerc',
          prompt: 'A, B, C și D sunt pe un cerc, AC este diametru și ∠BDC = 40°. Determină ∠BCA.',
          options: [['a', '40°'], ['b', '50°'], ['c', '60°'], ['d', '80°']].map(([id, label]) => ({ id, label })),
          correctOption: 'b',
          expectedAnswer: '50°',
          hint: 'Unghiurile înscrise care subîntind același arc sunt egale, iar unghiul care subîntinde diametrul este drept.',
          solution: ['∠BAC = ∠BDC = 40°.', '∠ABC = 90° deoarece AC este diametru.', '∠BCA = 180° − 90° − 40° = 50°.'],
        },
        {
          id: 's2-6',
          number: '6',
          points: 5,
          competency: 'Volumul piramidei',
          prompt: 'Piramida patrulateră regulată VABCD are VO = 6 cm și AB = 4 cm. Calculează volumul.',
          options: [['a', '32 cm³'], ['b', '48 cm³'], ['c', '72 cm³'], ['d', '96 cm³']].map(([id, label]) => ({ id, label })),
          correctOption: 'a',
          expectedAnswer: '32 cm³',
          hint: 'V = A_bază · h / 3.',
          solution: ['A_bază = 4² = 16 cm²', 'V = 16 · 6 / 3 = 32 cm³'],
        },
      ],
    },
    {
      id: 's3',
      title: 'Subiectul al III-lea',
      instructions: 'Scrie rezolvările complete.',
      points: 30,
      exercises: [
        {
          id: 's3-1',
          number: '1',
          points: 5,
          competency: 'Ecuații în probleme',
          prompt: 'Mai mulți copii cumpără o minge. La 18 lei de copil mai lipsesc 30 lei. a) Poate costa mingea 153 lei? b) La 24 lei de copil rămân 12 lei în plus. Determină prețul mingii.',
          expectedAnswer: 'a) Nu. b) 156 lei.',
          hint: 'Notează cu n numărul copiilor și scrie prețul în cele două situații.',
          solution: ['Prețul este 18n + 30.', '18n + 30 = 153 dă n = 123/18, care nu este natural; răspunsul la a) este nu.', '18n + 30 = 24n − 12, deci 6n = 42 și n = 7.', 'Prețul este 18 · 7 + 30 = 156 lei.'],
        },
        {
          id: 's3-2',
          number: '2',
          points: 5,
          competency: 'Expresii algebrice',
          prompt: 'Pentru x ≠ 2 și x ≠ 3, E(x) = x/(x−3) + 1/(x−2) + (7−3x)/((x−2)(x−3)). a) Arată că E(x) = (x−2)/(x−3). b) Arată că A = E(4)^n + E(4)^(n+3) este divizibil cu 18 pentru orice n natural nenul.',
          expectedAnswer: 'E(x) = (x−2)/(x−3), iar A = 9 · 2^n, deci 18 | A.',
          hint: 'Adu termenii lui E la același numitor, apoi calculează E(4).',
          solution: ['Numărătorul comun se reduce la (x−2)².', 'E(x) = (x−2)/(x−3).', 'E(4) = 2.', 'A = 2^n + 2^(n+3) = 2^n(1+8) = 9·2^n.', 'Pentru n ≥ 1, 2^n este divizibil cu 2, deci A este divizibil cu 18.'],
        },
        {
          id: 's3-3',
          number: '3',
          points: 5,
          competency: 'Funcția de gradul I',
          prompt: 'Se consideră f(x) = 3x − 6. a) Arată că f(1) + f(3) = 0. b) Graficul intersectează axele în A și B, iar M este mijlocul lui AB. Calculează OM.',
          expectedAnswer: 'OM = √10.',
          hint: 'Determină intersecțiile cu Ox și Oy, apoi folosește proprietatea mijlocului ipotenuzei.',
          solution: ['f(1) = −3 și f(3) = 3, deci suma este 0.', 'A(2,0), B(0,−6).', 'AB = √(2²+6²) = 2√10.', 'Mijlocul ipotenuzei unui triunghi dreptunghic este egal depărtat de vârfuri: OM = AB/2 = √10.'],
        },
        {
          id: 's3-4',
          number: '4',
          points: 5,
          competency: 'Geometria cercului',
          prompt: 'Într-un cerc de centru O și rază 6 cm, coardele AB și CD sunt perpendiculare. M este mijlocul coardei AB și OM = 3 cm. a) Arată că AM = 3√3 cm. b) Demonstrează că AC² + BD² = 144 cm².',
          expectedAnswer: 'AM = 3√3 cm și AC² + BD² = 144 cm².',
          hint: 'Pentru a), aplică Pitagora în triunghiul OMA. Pentru b), construiește diametrul BE.',
          solution: ['OM ⟂ AB, deci AM² = OA² − OM² = 36 − 9 = 27.', 'AM = 3√3 cm.', 'Cu BE diametru, ∠BAE = ∠BDE = 90°.', 'Rezultă AE ∥ CD și AC = DE.', 'În triunghiul dreptunghic BDE: DE² + BD² = BE² = 12² = 144; deci AC² + BD² = 144.'],
        },
        {
          id: 's3-5',
          number: '5',
          points: 5,
          competency: 'Paralelogram și asemănare',
          prompt: 'În paralelogramul ABCD, AB = 10 cm și AD = 8 cm. M, N și T sunt mijloacele lui BC, CD, respectiv AB, iar Q = BN ∩ AM. a) Calculează perimetrul lui ATND. b) Calculează AQ/QM.',
          expectedAnswer: 'a) 26 cm. b) AQ/QM = 4.',
          hint: 'ATND este paralelogram. Pentru raport, folosește linia mijlocie și triunghiuri asemenea.',
          solution: ['AT = DN = 5 cm și AD = TN = 8 cm.', 'P_ATND = 2·5 + 2·8 = 26 cm.', 'Din asemănarea triunghiurilor QNS și QBM rezultă SM/QM = 5/2.', 'Cum AM = 2·SM, rezultă AM/QM = 5, deci AQ/QM = 4.'],
        },
        {
          id: 's3-6',
          number: '6',
          points: 5,
          competency: 'Prismă dreaptă',
          prompt: 'Prisma dreaptă ABCDA′B′C′D′ are baza pătratul ABCD, AB = 4 cm și AA′ = 4√2 cm. a) Calculează aria laterală. b) Arată că distanța de la A′ la planul (C′BD) este 8√10/5 cm.',
          expectedAnswer: 'A_l = 64√2 cm²; d(A′,(C′BD)) = 8√10/5 cm.',
          hint: 'Aria laterală este perimetrul bazei ori înălțimea. Pentru distanță, identifică perpendiculara pe plan.',
          solution: ['A_l = 4·AB·AA′ = 4·4·4√2 = 64√2 cm².', 'BD este perpendiculară pe AC și pe AA′, deci BD ⟂ (A′AC).', 'Perpendiculara A′P pe C′O din planul (A′AC) este perpendiculară și pe BD, deci pe planul (C′BD).', 'Din aria triunghiului A′OC′ rezultă A′P = 8√10/5 cm.'],
        },
      ],
    },
  ],
}

export const NATIVE_OFFICIAL_PAPERS: NativeOfficialPaper[] = [en2026Main]

export function getNativeOfficialPaper(id: string, profile?: string): NativeOfficialPaper | null {
  return NATIVE_OFFICIAL_PAPERS.find(
    (paper) => paper.id === id && (!paper.profile || paper.profile === profile),
  ) ?? null
}
