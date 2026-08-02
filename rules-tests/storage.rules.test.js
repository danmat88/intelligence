const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing')
const { ref, uploadBytes, getBytes, deleteObject } = require('firebase/storage')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')

let env

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rezolvo',
    storage: { rules: readFileSync(resolve(__dirname, '../storage.rules'), 'utf8') },
  })
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearStorage()
})

const OWNER = 'storage-owner'
const STRANGER = 'storage-stranger'
const path = `users/${OWNER}/images/problem_123.jpg`

describe('Storage ownership and validation', () => {
  test('owner can upload, read and delete a bounded image', async () => {
    const me = env.authenticatedContext(OWNER)
    const image = ref(me.storage(), path)
    await assertSucceeds(uploadBytes(image, new Uint8Array([1, 2, 3]), { contentType: 'image/jpeg' }))
    await assertSucceeds(getBytes(image))
    await assertSucceeds(deleteObject(image))
  })

  test('another UID cannot read, overwrite or delete the image', async () => {
    const me = env.authenticatedContext(OWNER)
    const image = ref(me.storage(), path)
    await assertSucceeds(uploadBytes(image, new Uint8Array([1]), { contentType: 'image/jpeg' }))

    const them = env.authenticatedContext(STRANGER)
    const foreign = ref(them.storage(), path)
    await assertFails(getBytes(foreign))
    await assertFails(uploadBytes(foreign, new Uint8Array([2]), { contentType: 'image/jpeg' }))
    await assertFails(deleteObject(foreign))
  })

  test('unauthenticated access is rejected', async () => {
    const anon = env.unauthenticatedContext()
    const image = ref(anon.storage(), path)
    await assertFails(getBytes(image))
    await assertFails(uploadBytes(image, new Uint8Array([1]), { contentType: 'image/jpeg' }))
  })

  test('non-images and files at or above 2 MiB are rejected', async () => {
    const me = env.authenticatedContext(OWNER)
    await assertFails(uploadBytes(
      ref(me.storage(), `users/${OWNER}/images/not-image.txt`),
      new TextEncoder().encode('not an image'),
      { contentType: 'text/plain' },
    ))
    await assertFails(uploadBytes(
      ref(me.storage(), `users/${OWNER}/images/too-large.jpg`),
      new Uint8Array(2 * 1024 * 1024),
      { contentType: 'image/jpeg' },
    ))
    await assertFails(uploadBytes(
      ref(me.storage(), `users/${OWNER}/images/vector_123.jpg`),
      new TextEncoder().encode('<svg/>'),
      { contentType: 'image/svg+xml' },
    ))
    await assertFails(uploadBytes(
      ref(me.storage(), `users/${OWNER}/exports/archive.jpg`),
      new Uint8Array([1]),
      { contentType: 'image/jpeg' },
    ))
  })
})
