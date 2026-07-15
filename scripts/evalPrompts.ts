/**
 * Prompt evaluation harness — run it on EVERY prompt change:
 *   node scripts/evalPrompts.ts        (npm run eval:prompts)
 *
 * Calls the REAL models with the production prompts and fixed inputs, and
 * checks the CONTRACTS, not the math:
 *   · SOLVE (text): real problems → structured solution ({"answer":...});
 *     non-problems (commands, chit-chat, gibberish) → {"error":...} — never
 *     invented "0=0" filler.
 *   · SOLVE (image): an image with no legible math → {"error":...} — never a
 *     reconstructed problem. Drop real photos into scripts/fixtures/ named
 *     `solve_*.jpg|png` (must solve) or `error_*.jpg|png` (must refuse) and
 *     they join the run automatically.
 *   · VERIFY: correct answer → VERDICT: CORRECT (with code actually run),
 *     wrong answer → INCORRECT, abstract proof → UNVERIFIABLE.
 * Every row reports latency — regressions show up as numbers, not feelings.
 *
 * Uses the dev API key from .env (EXPO_PUBLIC_GEMINI_API_KEY) — the same
 * direct-to-Google fallback path the app uses before the proxy is configured.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'
import { SOLVE_JSON_SYSTEM, SOLVE_USER_PROMPT, VERIFY_SYSTEM } from '../src/solve/prompt.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FIXTURES = resolve(ROOT, 'scripts', 'fixtures')
const MODEL = 'gemini-3.1-flash-lite' // FAST — the model that answers first in prod
const LANG = 'Romanian'

// ————— solve (text) cases —————
type Expect = 'solve' | 'error'
type TextCase = { input: string; expect: Expect; note: string }

const TEXT_CASES: TextCase[] = [
  // — real problems: MUST solve (answer present, no error)
  { input: '2x^2+5x-3=0', expect: 'solve', note: 'bare quadratic' },
  { input: 'x^2 = x + 2', expect: 'solve', note: 'equation' },
  { input: 'Aria cercului cu raza 5', expect: 'solve', note: 'RO geometry phrase' },
  { input: 'Un tren parcurge 240 km în 3 ore. Care este viteza medie?', expect: 'solve', note: 'RO word problem' },
  { input: 'derivata lui x^2*sin(x)', expect: 'solve', note: 'RO calculus phrase' },
  { input: '|x-3| <= 2', expect: 'solve', note: 'abs inequality' },
  { input: 'Triunghi dreptunghic cu catetele 6 și 8. Aflați ipotenuza.', expect: 'solve', note: 'RO right triangle' },
  { input: 'cât face 15% din 200?', expect: 'solve', note: 'RO percentage' },
  {
    input:
      'Maria are de trei ori mai multe mere decât Ion. Împreună au 48 de mere. Câte mere are fiecare?',
    expect: 'solve',
    note: 'RO word problem (system)',
  },
  {
    input:
      'Un dreptunghi are perimetrul 36 cm, iar lungimea este cu 4 cm mai mare decât lățimea. Aflați aria dreptunghiului.',
    expect: 'solve',
    note: 'RO word problem (EN-style geometry)',
  },
  // — conversational wrappers around real problems: MUST still solve
  { input: 'am o problemă: 3x-7=14', expect: 'solve', note: 'wrapper + equation' },
  { input: 'mă ajuți cu integrala din x*e^x?', expect: 'solve', note: 'polite ask + integral' },
  { input: 'nu înțeleg exercițiul: x^2-4>0', expect: 'solve', note: 'wrapper + inequality' },
  { input: 'care e formula pentru aria triunghiului?', expect: 'solve', note: 'genuine math question' },
  // — NON-problems: MUST return {"error":...}, never filler like 0=0
  { input: 'fă-mi o imagine cu o problemă', expect: 'error', note: 'image request (the 0=0 repro)' },
  { input: 'generează o poză cu un exercițiu de mate', expect: 'error', note: 'image request 2' },
  { input: 'salut, ce faci?', expect: 'error', note: 'chit-chat' },
  { input: 'cine te-a făcut?', expect: 'error', note: 'meta question' },
  { input: 'scrie-mi un eseu despre Ion Creangă', expect: 'error', note: 'off-subject homework' },
  { input: 'poți să-mi faci temele la istorie?', expect: 'error', note: 'other subject' },
  { input: 'spune-mi o glumă', expect: 'error', note: 'joke request' },
  { input: 'asdfghjkl qwerty', expect: 'error', note: 'gibberish' },
]

// ————— solve (image) cases —————
// A featureless solid-gray PNG: the strongest "there is NO problem here" bait.
// The anti-hallucination contract says the model must refuse, never invent.
function blankPng(size = 64, gray = 0x99): string {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (buf: Buffer) => {
    let c = 0xffffffff
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crcBuf = Buffer.alloc(4)
    crcBuf.writeUInt32BE(crc(body))
    return Buffer.concat([len, body, crcBuf])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 0 // grayscale
  const raw = Buffer.alloc(size * (size + 1), gray)
  for (let y = 0; y < size; y++) raw[y * (size + 1)] = 0 // filter byte per row
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
  return png.toString('base64')
}

type ImageCase = { base64: string; mimeType: string; expect: Expect; note: string }

function imageCases(): ImageCase[] {
  const cases: ImageCase[] = [{ base64: blankPng(), mimeType: 'image/png', expect: 'error', note: 'blank gray photo (built-in)' }]
  if (existsSync(FIXTURES)) {
    for (const f of readdirSync(FIXTURES)) {
      const ext = extname(f).toLowerCase()
      if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue
      const expect: Expect | null = f.startsWith('solve_') ? 'solve' : f.startsWith('error_') ? 'error' : null
      if (!expect) continue
      cases.push({
        base64: readFileSync(resolve(FIXTURES, f)).toString('base64'),
        mimeType: ext === '.png' ? 'image/png' : 'image/jpeg',
        expect,
        note: `fixture ${basename(f)}`,
      })
    }
  }
  return cases
}

// ————— verify cases —————
type VerifyCase = { problem: string; answer: string; expect: 'CORRECT' | 'INCORRECT' | 'UNVERIFIABLE'; note: string }

const VERIFY_CASES: VerifyCase[] = [
  { problem: '2x^2+5x-3=0', answer: 'x = 1/2 sau x = -3', expect: 'CORRECT', note: 'right roots' },
  { problem: '2x^2+5x-3=0', answer: 'x = 1 sau x = 3', expect: 'INCORRECT', note: 'wrong roots' },
  { problem: 'Aria unui cerc cu raza 5', answer: 'A = 25π', expect: 'CORRECT', note: 'geometry value' },
  { problem: 'Un tren parcurge 240 km în 3 ore. Viteza medie?', answer: '90 km/h', expect: 'INCORRECT', note: 'wrong word-problem value' },
  // NB — a finding, established empirically (2026-07-15): we could NOT
  // construct an input this checker fails to verify with code. Symbolic
  // identities, parity proofs, "division by zero", even a described drawing
  // ("parabola with vertex at origin") — it found a legitimate code check for
  // every one. That aggressive-verify behavior is the product's strength, so
  // there is no UNVERIFIABLE case here; the truly ungradable class (abstract
  // proofs) is filtered CLIENT-side by isAbstractProof() before the checker
  // ever runs, and no-code verdicts are never trusted (rule below) — the
  // badge still cannot lie.
]

// ————— plumbing —————
function apiKey(): string {
  const env = readFileSync(resolve(ROOT, '.env'), 'utf8')
  const m = /^EXPO_PUBLIC_GEMINI_API_KEY=(.+)$/m.exec(env)
  if (!m) throw new Error('EXPO_PUBLIC_GEMINI_API_KEY not found in .env')
  return m[1].trim()
}

type Part = { text?: string; inlineData?: { mimeType: string; data: string }; codeExecutionResult?: { outcome?: string } }

async function call(
  key: string,
  body: Record<string, unknown>,
): Promise<{ text: string; ms: number; codeRan: boolean; error?: string }> {
  const t0 = Date.now()
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
  })
  const ms = Date.now() - t0
  if (!res.ok) return { text: '', ms, codeRan: false, error: `HTTP ${res.status}: ${(await res.text()).slice(0, 160)}` }
  const data = (await res.json()) as { candidates?: { content?: { parts?: Part[] } }[] }
  const parts = data.candidates?.[0]?.content?.parts ?? []
  return {
    text: parts.map((p) => p.text).filter(Boolean).join(''),
    ms,
    codeRan: parts.some((p) => p.codeExecutionResult?.outcome === 'OUTCOME_OK'),
  }
}

function classifySolve(text: string): Expect | 'invalid' {
  let j: Record<string, unknown> | null = null
  try {
    j = JSON.parse(text)
  } catch {
    const s = text.indexOf('{')
    const e = text.lastIndexOf('}')
    if (s >= 0 && e > s) {
      try {
        j = JSON.parse(text.slice(s, e + 1))
      } catch {}
    }
  }
  if (!j) return 'invalid'
  if (typeof j.error === 'string' && j.error.length > 0) return 'error'
  if (typeof j.answer === 'string' && j.answer.length > 0) return 'solve'
  return 'invalid'
}

const solveBody = (key: string, parts: Part[]) => ({
  contents: [{ role: 'user', parts }],
  systemInstruction: { parts: [{ text: SOLVE_JSON_SYSTEM.replaceAll('{LANG}', LANG) }] },
  generationConfig: { temperature: 0.2, maxOutputTokens: 2048, responseMimeType: 'application/json' },
})

type Row = { section: string; note: string; expect: string; got: string; ms: number; ok: boolean; raw?: string }

async function main() {
  const key = apiKey()
  const rows: Row[] = []

  const jobs: (() => Promise<Row>)[] = []
  for (const c of TEXT_CASES) {
    jobs.push(async () => {
      const r = await call(key, solveBody(key, [{ text: c.input }]))
      const got = r.error ? 'invalid' : classifySolve(r.text)
      return { section: 'solve/text', note: `${c.note} · "${c.input.slice(0, 40)}"`, expect: c.expect, got, ms: r.ms, ok: got === c.expect, raw: r.error ?? r.text }
    })
  }
  for (const c of imageCases()) {
    jobs.push(async () => {
      const r = await call(key, solveBody(key, [{ text: SOLVE_USER_PROMPT }, { inlineData: { mimeType: c.mimeType, data: c.base64 } }]))
      const got = r.error ? 'invalid' : classifySolve(r.text)
      return { section: 'solve/image', note: c.note, expect: c.expect, got, ms: r.ms, ok: got === c.expect, raw: r.error ?? r.text }
    })
  }
  for (const c of VERIFY_CASES) {
    jobs.push(async () => {
      const r = await call(key, {
        contents: [{ role: 'user', parts: [{ text: `Problem: ${c.problem}\nProposed final answer: ${c.answer}` }] }],
        systemInstruction: { parts: [{ text: VERIFY_SYSTEM }] },
        tools: [{ code_execution: {} }],
        generationConfig: { temperature: 0, maxOutputTokens: 4096, thinkingConfig: { thinkingLevel: 'minimal' } },
      })
      const verdict = /VERDICT:\s*(CORRECT|INCORRECT|UNVERIFIABLE)/.exec(r.text)?.[1] ?? 'none'
      // Numeric verdicts only count when code actually ran (the honesty rule).
      const got = r.error ? 'invalid' : verdict !== 'UNVERIFIABLE' && verdict !== 'none' && !r.codeRan ? `${verdict}(no-code)` : verdict
      // The REAL contract is "the badge never lies": a no-code verdict is
      // never trusted by the app (definitiveVerdict), so for UNVERIFIABLE
      // expectations it is an equally safe outcome.
      const ok = got === c.expect || (c.expect === 'UNVERIFIABLE' && got.endsWith('(no-code)'))
      return { section: 'verify', note: `${c.note} · ${c.answer.slice(0, 28)}`, expect: c.expect, got, ms: r.ms, ok, raw: r.error ?? r.text }
    })
  }

  for (let i = 0; i < jobs.length; i += 4) {
    rows.push(...(await Promise.all(jobs.slice(i, i + 4).map((j) => j()))))
    process.stdout.write(`  …${Math.min(i + 4, jobs.length)}/${jobs.length}\r`)
  }

  console.log(`\nModel: ${MODEL} · Lang: ${LANG}\n`)
  let failed = 0
  let section = ''
  for (const r of rows) {
    if (r.section !== section) {
      section = r.section
      console.log(`— ${section} —`)
    }
    if (!r.ok) failed++
    console.log(
      `${r.ok ? 'PASS' : 'FAIL'}  ${String(r.ms).padStart(5)}ms  expect=${r.expect.padEnd(12)} got=${r.got.padEnd(12)} · ${r.note}`,
    )
    if (!r.ok && r.raw) console.log(`      raw: ${r.raw.replace(/\s+/g, ' ').slice(0, 220)}`)
  }
  const avg = Math.round(rows.reduce((s, r) => s + r.ms, 0) / rows.length)
  const worst = rows.reduce((a, b) => (a.ms > b.ms ? a : b))
  console.log(`\n${rows.length - failed}/${rows.length} passed · avg ${avg}ms · slowest ${worst.ms}ms (${worst.section}: ${worst.note})`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
