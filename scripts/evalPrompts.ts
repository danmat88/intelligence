/**
 * Prompt evaluation harness — run it on EVERY prompt change:
 *   node scripts/evalPrompts.ts        (npm run eval:prompts)
 *
 * Calls the REAL fast model (the one that misbehaves when the prompt is weak)
 * with the production solve prompt and a fixed set of inputs, and checks the
 * CONTRACT, not the math: real problems must come back as structured solutions
 * ({"answer":...}), non-problems (commands, chit-chat, gibberish) must come
 * back as {"error":...} — never a made-up "0=0" solution. Quality is not a
 * feeling; it's this table staying green.
 *
 * Uses the dev API key from .env (EXPO_PUBLIC_GEMINI_API_KEY) — the same
 * direct-to-Google fallback path the app uses before the proxy is configured.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SOLVE_JSON_SYSTEM } from '../src/solve/prompt.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MODEL = 'gemini-3.1-flash-lite' // FAST — the model that answers first in prod
const LANG = 'Romanian'

type Expect = 'solve' | 'error'
type Case = { input: string; expect: Expect; note: string }

const CASES: Case[] = [
  // — real problems: MUST solve (answer present, no error)
  { input: '2x^2+5x-3=0', expect: 'solve', note: 'bare quadratic' },
  { input: 'x^2 = x + 2', expect: 'solve', note: 'equation' },
  { input: 'Aria cercului cu raza 5', expect: 'solve', note: 'RO geometry phrase' },
  { input: 'Un tren parcurge 240 km în 3 ore. Care este viteza medie?', expect: 'solve', note: 'RO word problem' },
  { input: 'derivata lui x^2*sin(x)', expect: 'solve', note: 'RO calculus phrase' },
  { input: '|x-3| <= 2', expect: 'solve', note: 'abs inequality' },
  { input: 'Triunghi dreptunghic cu catetele 6 și 8. Aflați ipotenuza.', expect: 'solve', note: 'RO right triangle' },
  { input: 'cât face 15% din 200?', expect: 'solve', note: 'RO percentage' },
  // — conversational wrappers around real problems: MUST still solve
  { input: 'am o problemă: 3x-7=14', expect: 'solve', note: 'wrapper + equation' },
  { input: 'mă ajuți cu integrala din x*e^x?', expect: 'solve', note: 'polite ask + integral' },
  { input: 'nu înțeleg exercițiul: x^2-4>0', expect: 'solve', note: 'wrapper + inequality' },
  { input: 'care e formula pentru aria triunghiului?', expect: 'solve', note: 'genuine math question' },
  // — NON-problems: MUST return {"error":...}, never filler like 0=0
  { input: 'fă-mi o imagine cu o problemă', expect: 'error', note: 'image request (Dan’s 0=0 repro)' },
  { input: 'generează o poză cu un exercițiu de mate', expect: 'error', note: 'image request 2' },
  { input: 'salut, ce faci?', expect: 'error', note: 'chit-chat' },
  { input: 'cine te-a făcut?', expect: 'error', note: 'meta question' },
  { input: 'scrie-mi un eseu despre Ion Creangă', expect: 'error', note: 'off-subject homework' },
  { input: 'poți să-mi faci temele la istorie?', expect: 'error', note: 'other subject' },
  { input: 'spune-mi o glumă', expect: 'error', note: 'joke request' },
  { input: 'asdfghjkl qwerty', expect: 'error', note: 'gibberish' },
]

function apiKey(): string {
  const env = readFileSync(resolve(ROOT, '.env'), 'utf8')
  const m = /^EXPO_PUBLIC_GEMINI_API_KEY=(.+)$/m.exec(env)
  if (!m) throw new Error('EXPO_PUBLIC_GEMINI_API_KEY not found in .env')
  return m[1].trim()
}

type Verdict = 'solve' | 'error' | 'invalid'

function classify(text: string): Verdict {
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

async function runCase(key: string, c: Case): Promise<{ c: Case; got: Verdict; raw: string }> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: c.input }] }],
      systemInstruction: { parts: [{ text: SOLVE_JSON_SYSTEM.replaceAll('{LANG}', LANG) }] },
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048, responseMimeType: 'application/json' },
    }),
  })
  if (!res.ok) return { c, got: 'invalid', raw: `HTTP ${res.status}: ${await res.text()}` }
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('') ?? ''
  return { c, got: classify(text), raw: text }
}

async function main() {
  const key = apiKey()
  const results: { c: Case; got: Verdict; raw: string }[] = []
  // small batches: fast enough, gentle on rate limits
  for (let i = 0; i < CASES.length; i += 4) {
    results.push(...(await Promise.all(CASES.slice(i, i + 4).map((c) => runCase(key, c)))))
    process.stdout.write(`  …${Math.min(i + 4, CASES.length)}/${CASES.length}\r`)
  }
  let failed = 0
  console.log(`\nModel: ${MODEL} · Lang: ${LANG}\n`)
  for (const r of results) {
    const ok = r.got === r.c.expect
    if (!ok) failed++
    const mark = ok ? 'PASS' : 'FAIL'
    console.log(`${mark}  expect=${r.c.expect.padEnd(5)} got=${r.got.padEnd(7)} · ${r.c.note} · "${r.c.input.slice(0, 48)}"`)
    if (!ok) console.log(`      raw: ${r.raw.replace(/\s+/g, ' ').slice(0, 220)}`)
  }
  console.log(`\n${results.length - failed}/${results.length} passed`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
