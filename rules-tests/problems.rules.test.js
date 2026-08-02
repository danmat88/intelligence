/**
 * Firestore security-rules tests, run against the emulator:
 *   npm run test:rules   (wraps `firebase emulators:exec --only firestore`)
 *
 * These lock in the two contracts the app depends on:
 *   1. users/{uid}/problems is OWNER-ONLY — no cross-user reads or writes.
 *   2. Every write must match the app's exact document shape (key whitelist,
 *      types, size caps) — a tampered client can't pollute the tree.
 */
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing')
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection } = require('firebase/firestore')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')

let env

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rezolvo', // demo- prefix: pure emulator, never a real project
    firestore: { rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8') },
  })
})
afterAll(async () => {
  await env.cleanup()
})
beforeEach(async () => {
  await env.clearFirestore()
})

const OWNER = 'user-owner'
const STRANGER = 'user-stranger'

const validProblem = () => ({
  title: '2x^2+5x-3=0',
  topic: 'Quadratics',
  turns: [
    { role: 'user', text: '2x^2+5x-3=0' },
    { role: 'assistant', text: '{"answer":"x=1/2"}' },
  ],
  photo: false,
  createdAt: new Date(),
})

const problemRef = (ctx, uid, id = 'p1') => doc(ctx.firestore(), 'users', uid, 'problems', id)
const profileRef = (ctx, uid) => doc(ctx.firestore(), 'users', uid, 'profile', 'learning')
const practiceAttemptRef = (ctx, uid, id = 'a1') => doc(ctx.firestore(), 'users', uid, 'practiceAttempts', id)
const practiceResponseRef = (ctx, uid, id = 'a1', exerciseId = 'e1') =>
  doc(ctx.firestore(), 'users', uid, 'practiceAttempts', id, 'responses', exerciseId)
const paperAttemptRef = (ctx, uid, id = 'p1') => doc(ctx.firestore(), 'users', uid, 'paperAttempts', id)
const paperResponseRef = (ctx, uid, id = 'p1', exerciseId = 'e1') =>
  doc(ctx.firestore(), 'users', uid, 'paperAttempts', id, 'responses', exerciseId)

const validProfile = (overrides = {}) => ({
  schemaVersion: 1,
  onboardingCompleted: true,
  examGoal: 'en',
  bacTrack: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const validPracticeAttempt = (overrides = {}) => ({
  schemaVersion: 1,
  setId: 'en-algebra-1',
  exam: 'en',
  profile: null,
  score: 4,
  total: 5,
  startedAt: new Date(Date.now() - 60_000),
  completedAt: new Date(),
  mode: 'practice',
  elapsedSeconds: 60,
  responseCount: 5,
  assistedCount: 1,
  ...overrides,
})

const validPaperAttempt = (overrides = {}) => ({
  schemaVersion: 1,
  packageId: 'en-2026-model',
  exam: 'en',
  year: 2026,
  session: 'Model oficial',
  profile: null,
  mode: 'simulation',
  startedAt: new Date(Date.now() - 120_000),
  completedAt: null,
  elapsedSeconds: 120,
  exerciseIndex: 2,
  responseCount: 2,
  assistedCount: 0,
  score: null,
  maxScore: null,
  ...overrides,
})

describe('ownership', () => {
  test('owner can create a valid problem', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertSucceeds(setDoc(problemRef(me, OWNER), validProblem()))
  })

  test('owner can read, update and delete their problem', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertSucceeds(setDoc(problemRef(me, OWNER), validProblem()))
    await assertSucceeds(getDoc(problemRef(me, OWNER)))
    await assertSucceeds(updateDoc(problemRef(me, OWNER), { turns: [{ role: 'user', text: 'x' }] }))
    await assertSucceeds(deleteDoc(problemRef(me, OWNER)))
  })

  test('a stranger can neither read nor write my problems', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertSucceeds(setDoc(problemRef(me, OWNER), validProblem()))
    const them = env.authenticatedContext(STRANGER)
    await assertFails(getDoc(problemRef(them, OWNER)))
    await assertFails(setDoc(problemRef(them, OWNER, 'p2'), validProblem()))
    await assertFails(deleteDoc(problemRef(them, OWNER)))
  })

  test('unauthenticated gets nothing', async () => {
    const anon = env.unauthenticatedContext()
    await assertFails(getDoc(problemRef(anon, OWNER)))
    await assertFails(setDoc(problemRef(anon, OWNER), validProblem()))
  })
})

describe('schema validation', () => {
  test('unknown fields are rejected', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertFails(setDoc(problemRef(me, OWNER), { ...validProblem(), hacked: true }))
  })

  test('title must be a string and fit the cap', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertFails(setDoc(problemRef(me, OWNER), { ...validProblem(), title: 42 }))
    await assertFails(setDoc(problemRef(me, OWNER), { ...validProblem(), title: 'x'.repeat(201) }))
  })

  test('topic may be null but not a number or oversized', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertSucceeds(setDoc(problemRef(me, OWNER), { ...validProblem(), topic: null }))
    await assertFails(setDoc(problemRef(me, OWNER, 'p2'), { ...validProblem(), topic: 7 }))
    await assertFails(setDoc(problemRef(me, OWNER, 'p3'), { ...validProblem(), topic: 'x'.repeat(81) }))
  })

  test('turns must be a bounded list', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertFails(setDoc(problemRef(me, OWNER), { ...validProblem(), turns: 'not a list' }))
    const tooMany = Array.from({ length: 41 }, () => ({ role: 'user', text: 'x' }))
    await assertFails(setDoc(problemRef(me, OWNER), { ...validProblem(), turns: tooMany }))
  })

  test('every nested turn is validated and image paths stay under the owner', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertFails(setDoc(problemRef(me, OWNER), {
      ...validProblem(), turns: [{ role: 'system', text: 'injected' }],
    }))
    await assertFails(setDoc(problemRef(me, OWNER, 'p2'), {
      ...validProblem(), turns: [{ role: 'user', text: 'x', extra: true }],
    }))
    await assertFails(setDoc(problemRef(me, OWNER, 'p3'), {
      ...validProblem(), turns: [{ role: 'user', text: 'x', imagePath: `users/${STRANGER}/images/x.jpg` }],
    }))
    await assertSucceeds(setDoc(problemRef(me, OWNER, 'p4'), {
      ...validProblem(),
      turns: [{
        role: 'user',
        text: 'x',
        imagePath: `users/${OWNER}/images/x.jpg`,
        imageW: 100,
        imageH: 200,
      }],
    }))
    await assertFails(setDoc(problemRef(me, OWNER, 'p5'), {
      ...validProblem(),
      turns: [{ role: 'user', text: 'x', imageUrl: 'https://example.com/public.jpg' }],
    }))
  })

  test('photo and createdAt are type-checked when present', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertFails(setDoc(problemRef(me, OWNER), { ...validProblem(), photo: 'yes' }))
    await assertFails(setDoc(problemRef(me, OWNER), { ...validProblem(), createdAt: 12345 }))
  })

  test('saved is an optional boolean, never an arbitrary payload', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertSucceeds(setDoc(problemRef(me, OWNER), { ...validProblem(), saved: true }))
    await assertFails(setDoc(problemRef(me, OWNER, 'p2'), { ...validProblem(), saved: 'yes' }))
  })

  test('merge-update keeps validating the merged result', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertSucceeds(setDoc(problemRef(me, OWNER), validProblem()))
    // valid partial merge (what persist() does after the first save)
    await assertSucceeds(setDoc(problemRef(me, OWNER), { title: 'healed', turns: [] }, { merge: true }))
    // merging in a foreign field must still be rejected
    await assertFails(setDoc(problemRef(me, OWNER), { smuggled: 1 }, { merge: true }))
  })

  test('createdAt cannot be omitted on create or rewritten later', async () => {
    const me = env.authenticatedContext(OWNER)
    const { createdAt, ...missingDate } = validProblem()
    await assertFails(setDoc(problemRef(me, OWNER), missingDate))
    await assertSucceeds(setDoc(problemRef(me, OWNER), validProblem()))
    await assertFails(updateDoc(problemRef(me, OWNER), { createdAt: new Date(Date.now() + 1000) }))
  })
})

describe('learning profile', () => {
  test('owner can read and write the canonical profile', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertSucceeds(setDoc(profileRef(me, OWNER), validProfile()))
    await assertSucceeds(getDoc(profileRef(me, OWNER)))
  })

  test('no-exam is valid without inventing a general curriculum', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertSucceeds(setDoc(profileRef(me, OWNER), validProfile({ examGoal: null })))
  })

  test('BAC requires one of the canonical tracks', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertFails(setDoc(profileRef(me, OWNER), validProfile({ examGoal: 'bac' })))
    await assertFails(setDoc(profileRef(me, OWNER), validProfile({ examGoal: 'bac', bacTrack: 'uman' })))
    await assertSucceeds(setDoc(profileRef(me, OWNER), validProfile({ examGoal: 'bac', bacTrack: 'mate_info' })))
  })

  test('EN and no-exam cannot retain a BAC track', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertFails(setDoc(profileRef(me, OWNER), validProfile({ examGoal: 'en', bacTrack: 'mate_info' })))
    await assertFails(setDoc(profileRef(me, OWNER), validProfile({ examGoal: null, bacTrack: 'tehnologic' })))
  })

  test('profile rejects unknown fields, invalid versions and malformed timestamps', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertFails(setDoc(profileRef(me, OWNER), validProfile({ extra: true })))
    await assertFails(setDoc(profileRef(me, OWNER), validProfile({ schemaVersion: 2 })))
    await assertFails(setDoc(profileRef(me, OWNER), validProfile({ updatedAt: Date.now() })))
  })

  test('profile creation time is immutable', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertSucceeds(setDoc(profileRef(me, OWNER), validProfile()))
    await assertFails(updateDoc(profileRef(me, OWNER), { createdAt: new Date(Date.now() + 1000) }))
  })

  test('profile is private to its UID and only the learning document is allowed', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertSucceeds(setDoc(profileRef(me, OWNER), validProfile()))
    const them = env.authenticatedContext(STRANGER)
    await assertFails(getDoc(profileRef(them, OWNER)))
    await assertFails(setDoc(profileRef(them, OWNER), validProfile()))
    await assertFails(setDoc(doc(me.firestore(), 'users', OWNER, 'profile', 'other'), validProfile()))
  })
})

describe('practice attempts', () => {
  test('owner can write a valid summary and independently validated response', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertSucceeds(setDoc(practiceAttemptRef(me, OWNER), validPracticeAttempt()))
    await assertSucceeds(setDoc(practiceResponseRef(me, OWNER), {
      value: '42', correct: true, assistance: 'none', prompt: 'Calculează 6 · 7.', competency: 'Calcul',
    }))
    await assertSucceeds(setDoc(practiceAttemptRef(me, OWNER, 'general'), validPracticeAttempt({
      setId: 'general_12345678', exam: null, topic: 'Ecuații', profile: null, score: 1, total: 1,
      responseCount: 1, assistedCount: 0,
    })))
  })

  test('invalid scores, exam profiles and response payloads are rejected', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertFails(setDoc(practiceAttemptRef(me, OWNER), validPracticeAttempt({ score: 6 })))
    await assertFails(setDoc(practiceAttemptRef(me, OWNER), validPracticeAttempt({ exam: 'bac', profile: null })))
    await assertFails(setDoc(practiceAttemptRef(me, OWNER), validPracticeAttempt({ exam: 'bac', profile: 'Mate-info' })))
    await assertSucceeds(setDoc(practiceAttemptRef(me, OWNER), validPracticeAttempt({ exam: 'bac', profile: 'mate_info' })))
    await assertFails(setDoc(practiceAttemptRef(me, OWNER), validPracticeAttempt({ exam: null, topic: null, profile: null })))
    await assertFails(setDoc(practiceResponseRef(me, OWNER), {
      value: 'x'.repeat(2001), correct: true, assistance: 'none',
    }))
    await assertSucceeds(setDoc(practiceResponseRef(me, OWNER), {
      value: '42', correct: true, assistance: 'solution',
    }))
    await assertFails(setDoc(practiceResponseRef(me, OWNER), {
      value: '42', correct: true, assistance: 'solution', prompt: 'x'.repeat(2001),
    }))
  })

  test('completed practice evidence is immutable', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertSucceeds(setDoc(practiceAttemptRef(me, OWNER), validPracticeAttempt()))
    await assertFails(updateDoc(practiceAttemptRef(me, OWNER), { score: 5 }))
  })

  test('a stranger cannot read or write attempts or responses', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertSucceeds(setDoc(practiceAttemptRef(me, OWNER), validPracticeAttempt()))
    const them = env.authenticatedContext(STRANGER)
    await assertFails(getDoc(practiceAttemptRef(them, OWNER)))
    await assertFails(setDoc(practiceResponseRef(them, OWNER), {
      value: '42', correct: true, assistance: 'none',
    }))
  })
})

describe('official paper attempts', () => {
  test('owner can save an open paper and a bounded response', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertSucceeds(setDoc(paperAttemptRef(me, OWNER), validPaperAttempt()))
    await assertSucceeds(setDoc(paperResponseRef(me, OWNER), {
      value: 'Calculele mele', assistance: 'none',
    }))
  })

  test('completion score is coherent and BAC requires a profile', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertSucceeds(setDoc(paperAttemptRef(me, OWNER), validPaperAttempt({
      completedAt: new Date(), score: 30, maxScore: 40,
    })))
    await assertFails(setDoc(paperAttemptRef(me, OWNER, 'p2'), validPaperAttempt({ score: 30, maxScore: null })))
    await assertFails(setDoc(paperAttemptRef(me, OWNER, 'p3'), validPaperAttempt({ exam: 'bac', profile: null })))
    await assertFails(setDoc(paperAttemptRef(me, OWNER, 'p4'), validPaperAttempt({ exam: 'bac', profile: 'real' })))
    await assertSucceeds(setDoc(paperAttemptRef(me, OWNER, 'p5'), validPaperAttempt({ exam: 'bac', profile: 'pedagogic' })))
  })

  test('official responses reject unknown fields and invalid assistance', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertFails(setDoc(paperResponseRef(me, OWNER), {
      value: 'x', assistance: 'friend',
    }))
    await assertFails(setDoc(paperResponseRef(me, OWNER), {
      value: 'x', assistance: 'hint', injected: true,
    }))
  })

  test('paper identity is immutable and completion cannot be reopened', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertSucceeds(setDoc(paperAttemptRef(me, OWNER), validPaperAttempt()))
    await assertFails(updateDoc(paperAttemptRef(me, OWNER), { packageId: 'other' }))
    await assertSucceeds(updateDoc(paperAttemptRef(me, OWNER), {
      completedAt: new Date(), score: 30, maxScore: 40,
    }))
    await assertFails(updateDoc(paperAttemptRef(me, OWNER), {
      completedAt: null, score: null, maxScore: null,
    }))
  })
})

describe('everything outside problems is server territory', () => {
  test('the user doc itself is not writable', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertFails(setDoc(doc(me.firestore(), 'users', OWNER), { any: 'thing' }))
  })

  test('the user doc (tier) is readable by its owner only — and still never writable', async () => {
    // Seed a tier the way the RevenueCat webhook does (Admin SDK bypasses rules).
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', OWNER), { tier: 'premium' })
    })
    const me = env.authenticatedContext(OWNER)
    await assertSucceeds(getDoc(doc(me.firestore(), 'users', OWNER)))
    // Self-promotion to premium must be impossible from a client.
    await assertFails(setDoc(doc(me.firestore(), 'users', OWNER), { tier: 'premium' }, { merge: true }))
    const them = env.authenticatedContext(STRANGER)
    await assertFails(getDoc(doc(them.firestore(), 'users', OWNER)))
  })

  test('daily_solves is invisible to clients', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertFails(getDoc(doc(me.firestore(), 'daily_solves', OWNER)))
    await assertFails(setDoc(doc(me.firestore(), 'daily_solves', OWNER), { problems: [] }))
  })

  test('arbitrary subcollections are not writable', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertFails(setDoc(doc(me.firestore(), 'users', OWNER, 'secrets', 's1'), { any: 'thing' }))
  })

  test('rate_limits is invisible to clients', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertFails(getDoc(doc(me.firestore(), 'rate_limits', OWNER)))
    await assertFails(setDoc(doc(me.firestore(), 'rate_limits', OWNER), { count: 0 }))
  })

  test('problems still listable by their owner', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertSucceeds(setDoc(problemRef(me, OWNER), validProblem()))
    const { getDocs, query } = require('firebase/firestore')
    await assertSucceeds(getDocs(query(collection(me.firestore(), 'users', OWNER, 'problems'))))
  })
})
