import { initializeApp } from 'firebase-admin/app'

initializeApp()

// Each surface lives in its own module; none of them touch the Admin SDK at
// module scope, so the initializeApp() above always runs first.
export { gemini } from './gemini'
export { account } from './account'
export { purgeStaleGuests } from './purge'
export { revenuecat } from './revenuecat'
