import { Asset } from 'expo-asset'
import * as FS from 'expo-file-system/legacy'

/**
 * Local KaTeX + marked for the solution WebViews: bundled in the app,
 * copied once to the cache directory, then loaded from file:// — no CDN,
 * no network latency, full offline math. `ensureMathAssets()` resolves to
 * the base directory (with trailing slash) or null if anything failed —
 * callers fall back to the CDN in that case, so this can never break a card.
 *
 * Bump the version segment when upgrading katex/marked so stale copies are
 * replaced.
 */
const DIR_NAME = 'mathkit-v2/'

// NOTE: bundled basenames must be unique IGNORING extension — Android release
// builds flatten assets into res/raw by extension-less name, so katex.kcss +
// katex.kjs would collide as "assets_katex_katex" (real failed build).
const FILES: Record<string, number> = {
  'katex.css': require('../../../assets/katex/katex-style.kcss'),
  'katex.js': require('../../../assets/katex/katex-lib.kjs'),
  'auto-render.js': require('../../../assets/katex/auto-render.kjs'),
  'marked.js': require('../../../assets/katex/marked.kjs'),
  'fonts/KaTeX_AMS-Regular.woff2': require('../../../assets/katex/fonts/KaTeX_AMS-Regular.woff2'),
  'fonts/KaTeX_Caligraphic-Bold.woff2': require('../../../assets/katex/fonts/KaTeX_Caligraphic-Bold.woff2'),
  'fonts/KaTeX_Caligraphic-Regular.woff2': require('../../../assets/katex/fonts/KaTeX_Caligraphic-Regular.woff2'),
  'fonts/KaTeX_Fraktur-Bold.woff2': require('../../../assets/katex/fonts/KaTeX_Fraktur-Bold.woff2'),
  'fonts/KaTeX_Fraktur-Regular.woff2': require('../../../assets/katex/fonts/KaTeX_Fraktur-Regular.woff2'),
  'fonts/KaTeX_Main-Bold.woff2': require('../../../assets/katex/fonts/KaTeX_Main-Bold.woff2'),
  'fonts/KaTeX_Main-BoldItalic.woff2': require('../../../assets/katex/fonts/KaTeX_Main-BoldItalic.woff2'),
  'fonts/KaTeX_Main-Italic.woff2': require('../../../assets/katex/fonts/KaTeX_Main-Italic.woff2'),
  'fonts/KaTeX_Main-Regular.woff2': require('../../../assets/katex/fonts/KaTeX_Main-Regular.woff2'),
  'fonts/KaTeX_Math-BoldItalic.woff2': require('../../../assets/katex/fonts/KaTeX_Math-BoldItalic.woff2'),
  'fonts/KaTeX_Math-Italic.woff2': require('../../../assets/katex/fonts/KaTeX_Math-Italic.woff2'),
  'fonts/KaTeX_SansSerif-Bold.woff2': require('../../../assets/katex/fonts/KaTeX_SansSerif-Bold.woff2'),
  'fonts/KaTeX_SansSerif-Italic.woff2': require('../../../assets/katex/fonts/KaTeX_SansSerif-Italic.woff2'),
  'fonts/KaTeX_SansSerif-Regular.woff2': require('../../../assets/katex/fonts/KaTeX_SansSerif-Regular.woff2'),
  'fonts/KaTeX_Script-Regular.woff2': require('../../../assets/katex/fonts/KaTeX_Script-Regular.woff2'),
  'fonts/KaTeX_Size1-Regular.woff2': require('../../../assets/katex/fonts/KaTeX_Size1-Regular.woff2'),
  'fonts/KaTeX_Size2-Regular.woff2': require('../../../assets/katex/fonts/KaTeX_Size2-Regular.woff2'),
  'fonts/KaTeX_Size3-Regular.woff2': require('../../../assets/katex/fonts/KaTeX_Size3-Regular.woff2'),
  'fonts/KaTeX_Size4-Regular.woff2': require('../../../assets/katex/fonts/KaTeX_Size4-Regular.woff2'),
  'fonts/KaTeX_Typewriter-Regular.woff2': require('../../../assets/katex/fonts/KaTeX_Typewriter-Regular.woff2'),
  // The app's own faces, so the thread document is typographically identical
  // to the native chrome around it.
  'fonts/SpaceGrotesk-Bold.ttf': require('@expo-google-fonts/space-grotesk/700Bold/SpaceGrotesk_700Bold.ttf'),
  'fonts/Inter-Regular.ttf': require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  'fonts/Inter-Medium.ttf': require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
  'fonts/Inter-SemiBold.ttf': require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
  'fonts/JetBrainsMono-SemiBold.ttf': require('@expo-google-fonts/jetbrains-mono/600SemiBold/JetBrainsMono_600SemiBold.ttf'),
}

/** Resolved base dir once ready — lets components read it synchronously. */
export let mathAssetsBase: string | null = null

async function prepare(): Promise<string> {
  const dir = FS.cacheDirectory + DIR_NAME
  const marker = dir + '.done'
  if ((await FS.getInfoAsync(marker)).exists) return dir

  // Fresh (or stale) copy — rebuild the directory from scratch.
  await FS.deleteAsync(dir, { idempotent: true })
  await FS.makeDirectoryAsync(dir + 'fonts', { intermediates: true })
  const entries = Object.entries(FILES)
  await Asset.loadAsync(Object.values(FILES))
  await Promise.all(
    entries.map(async ([rel, mod]) => {
      const a = Asset.fromModule(mod)
      if (!a.localUri) await a.downloadAsync()
      if (!a.localUri) throw new Error(`asset not local: ${rel}`)
      await FS.copyAsync({ from: a.localUri, to: dir + rel })
    }),
  )
  await FS.writeAsStringAsync(marker, 'ok')
  return dir
}

let promise: Promise<string | null> | null = null

export function ensureMathAssets(): Promise<string | null> {
  if (!promise) {
    promise = prepare()
      .then((dir) => {
        mathAssetsBase = dir
        return dir
      })
      .catch(() => null) // CDN fallback — a broken copy must never break math
  }
  return promise
}

// Warm at import — ready long before the first card ever mounts.
ensureMathAssets()
