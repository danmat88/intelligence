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

  test('photo and createdAt are type-checked when present', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertFails(setDoc(problemRef(me, OWNER), { ...validProblem(), photo: 'yes' }))
    await assertFails(setDoc(problemRef(me, OWNER), { ...validProblem(), createdAt: 12345 }))
  })

  test('merge-update keeps validating the merged result', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertSucceeds(setDoc(problemRef(me, OWNER), validProblem()))
    // valid partial merge (what persist() does after the first save)
    await assertSucceeds(setDoc(problemRef(me, OWNER), { title: 'healed', turns: [] }, { merge: true }))
    // merging in a foreign field must still be rejected
    await assertFails(setDoc(problemRef(me, OWNER), { smuggled: 1 }, { merge: true }))
  })
})

describe('everything outside problems is server territory', () => {
  test('the user doc itself is not writable', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertFails(setDoc(doc(me.firestore(), 'users', OWNER), { any: 'thing' }))
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
