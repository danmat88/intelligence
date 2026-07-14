import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Tiny hand-rolled i18n: one catalog per language, a `t(key)` hook with
 * {placeholder} interpolation, and a persisted preference. Romanian is the
 * default (RO-first launch); English ships from day one so going international
 * is a marketing decision, not a code change. The AI answers in the app
 * language via the `lang` value passed into the solve prompts.
 */

export type Lang = 'ro' | 'en'

const STORAGE_KEY = '@rezolvo.lang'

const STRINGS = {
  en: {
    // — solver hero
    'hero.kicker': 'READY WHEN YOU ARE',
    'hero.kicker.named': 'HI, {name} — READY WHEN YOU ARE',
    'hero.title.lead': 'What are we ',
    'hero.title.accent': 'solving?',
    'hero.snap.title': 'Snap a problem',
    'hero.snap.sub': 'Point at anything — printed or handwritten.',
    'hero.library': 'Choose from library',
    'hero.examples': '…or tap an example',
    'hero.example.derivative': 'derivative of x²·sin(x)',
    // — header
    'header.new': 'New',
    // — composer
    'composer.placeholder.first': 'Type a problem…',
    'composer.placeholder.followup': 'Ask about this problem…',
    'composer.disclaimer': 'Verify important answers — AI can make mistakes.',
    'composer.preview': "WHAT YOU'LL SEND",
    'composer.guestCta': 'Sign in to keep your work — it takes 5 seconds',
    // — pending stages
    'pending.1': 'Reading the problem…',
    'pending.2': 'Working the steps…',
    'pending.3': 'Double-checking the answer…',
    'pending.4': 'This one is tougher — still working on it…',
    'pending.cancel': 'Cancel',
    // — chips / turns
    'turn.explainStep': 'Explain step {n}',
    'turn.practiceStep': "Let's practice step {n}",
    'turn.similar': 'A similar problem',
    'turn.photoProblem': 'Photo problem',
    // — solution card (rendered in the WebView)
    'solution.label': 'Solution · tap a step to re-explain',
    'solution.answer': 'Answer',
    'solution.graph': 'See it — the curve meets the x-axis at your answers',
    'solution.figure': 'Figure',
    'solution.numberline': 'Number line',
    'solution.chip.similar': 'Similar problem',
    'solution.chip.mistake': 'I typed it wrong',
    'solution.verifying': 'Checking…',
    'solution.reverifying': 'Re-solving carefully…',
    'solution.verified': 'Verified',
    'verify.info.title.ok': 'Verified with code',
    'verify.info.body.ok':
      'Rezolvo ran the actual computation in code (Python) and the result matches the answer shown. This is a machine check — not just the AI being confident.',
    'common.ok': 'Got it',
    // — actions
    'action.copy': 'Copy',
    'action.copied': 'Copied',
    'action.share': 'Share',
    'share.problem': 'Problem',
    'share.signature': 'Solved with Rezolvo',
    'doc.you': 'You',
    'doc.readAs': 'Read as',
    'doc.fix': 'Fix it',
    // — errors
    'err.network': "Couldn't reach the internet — check your connection and try again.",
    'err.busy': "I'm a bit busy right now — give it a moment and try again.",
    'err.unavailable': 'The AI service is unavailable right now — please try again later.',
    'err.auth': 'Please sign in again, then retry.',
    'err.generic': 'Something went wrong solving that. Try again.',
    'err.camera': 'Could not open the camera — check the permission in Settings.',
    'err.retry': 'Try again',
    'net.offline': 'No connection — check your internet',
    'busy.wait': 'One at a time — waiting for the current answer…',
    // — auth feedback
    'auth.signedInAs': 'Signed in as {name}',
    'auth.signedOut': 'Signed out',
    'auth.signIn': 'Sign in',
    'auth.carried': 'Your saved work came along ({n})',
    'auth.migrateBlocked': "Couldn't bring your work into that account — check your connection and try again.",
    // — welcome (offline fallback gate)
    'welcome.tagline': 'Snap any math problem — solved and explained, step by step.',
    'welcome.google': 'Continue with Google',
    'welcome.caption': 'Sign in to save your solved problems to your account.',
    'welcome.guest': 'Continue without an account',
    // — history
    'history.title': 'Your work',
    'history.stat.solved': 'solved',
    'history.stat.streak': 'days in a row',
    'history.stat.streak.one': 'day in a row',
    'history.section.today': 'Today',
    'history.section.yesterday': 'Yesterday',
    'history.section.week': 'This week',
    'history.section.earlier': 'Earlier',
    'history.search': 'Search your work…',
    'history.all': 'All',
    'history.empty': 'Nothing yet — solve a problem and it lands here.',
    'history.noMatch': 'No matches.',
    'history.justNow': 'just now',
    'history.deleted': 'Problem deleted',
    'history.undo': 'Undo',
    // — settings
    'settings.title': 'Settings',
    'settings.guest.title': 'Sign in to save your work',
    'settings.guest.sub': 'Keep your solved problems across devices — 5 seconds with Google.',
    'settings.deleted': 'Account deleted',
    'settings.section.prefs': 'Preferences',
    'settings.section.legal': 'Legal',
    'settings.section.account': 'Account',
    'settings.language': 'Language',
    'settings.language.value': 'English',
    'settings.signOut': 'Sign out',
    'settings.delete': 'Delete account',
    'settings.deleting': 'Deleting account…',
    'settings.deleteNote': 'Deleting removes your account and all your solved problems permanently.',
    'settings.deleteError': 'Could not delete account - try again.',
    'settings.confirm.title': 'Delete account?',
    'settings.confirm.message':
      'This permanently deletes your account and every solved problem, on all devices. There is no undo.',
    'settings.confirm.cta': 'Delete forever',
    'settings.confirm.cancel': 'Cancel',
    'settings.privacy': 'Privacy policy',
    'settings.terms': 'Terms of service',
    'a11y.send': 'Send',
    'a11y.stop': 'Stop solving',
    'a11y.camera': 'Take a photo',
    'a11y.delete': 'Delete',
    'a11y.close': 'Close',
    'a11y.torch': 'Flashlight',
    'a11y.shutter': 'Take the photo',
    // — in-app capture (camera visor + trim)
    'capture.title': 'Take a photo',
    'capture.hint': 'Frame the problem',
    'capture.warming': 'Starting the camera…',
    'capture.lblGallery': 'Gallery',
    'capture.lblType': 'Type',
    'crop.hint': 'Drag the corners to frame the problem',
    'capture.denied': 'Rezolvo needs the camera to photograph problems. Enable it in Settings.',
    'capture.allow': 'Allow the camera',
    'capture.openSettings': 'Open settings',
    'capture.typeInstead': 'Type it instead',
    'crop.title': 'Select the problem',
    'crop.retake': 'Retake',
    'crop.chooseAnother': 'Choose another',
    'crop.solve': 'Solve',
  },
  ro: {
    // — solver hero
    'hero.kicker': 'GATA CÂND EȘTI TU',
    'hero.kicker.named': 'SALUT, {name} — GATA CÂND EȘTI TU',
    'hero.title.lead': 'Ce ',
    'hero.title.accent': 'rezolvăm?',
    'hero.snap.title': 'Fotografiază o problemă',
    'hero.snap.sub': 'Țintește orice — tipărit sau scris de mână.',
    'hero.library': 'Alege din galerie',
    'hero.examples': '…sau atinge un exemplu',
    'hero.example.derivative': 'derivata lui x²·sin(x)',
    // — header
    'header.new': 'Nouă',
    // — composer
    'composer.placeholder.first': 'Scrie o problemă…',
    'composer.placeholder.followup': 'Întreabă despre problema asta…',
    'composer.disclaimer': 'Verifică răspunsurile importante — AI-ul poate greși.',
    'composer.preview': 'SE VA TRIMITE CA',
    'composer.guestCta': 'Conectează-te ca să-ți păstrezi munca — durează 5 secunde',
    // — pending stages
    'pending.1': 'Citesc problema…',
    'pending.2': 'Lucrez pașii…',
    'pending.3': 'Verific răspunsul…',
    'pending.4': 'E mai grea — încă lucrez la ea…',
    'pending.cancel': 'Anulează',
    // — chips / turns
    'turn.explainStep': 'Explică pasul {n}',
    'turn.practiceStep': 'Hai să exersăm pasul {n}',
    'turn.similar': 'O problemă similară',
    'turn.photoProblem': 'Problemă din poză',
    // — solution card (rendered in the WebView)
    'solution.label': 'Rezolvare · atinge un pas pentru altă explicație',
    'solution.answer': 'Răspuns',
    'solution.graph': 'Vezi — curba atinge axa x exact la răspunsurile tale',
    'solution.figure': 'Figură',
    'solution.numberline': 'Axa numerelor',
    'solution.chip.similar': 'Problemă similară',
    'solution.chip.mistake': 'Am scris-o greșit',
    'solution.verifying': 'Se verifică…',
    'solution.reverifying': 'Recalculez cu atenție…',
    'solution.verified': 'Verificat',
    'verify.info.title.ok': 'Verificat cu cod',
    'verify.info.body.ok':
      'Rezolvo a rulat calculul efectiv în cod (Python), iar rezultatul coincide cu răspunsul afișat. E o verificare de mașină — nu doar părerea AI-ului.',
    'common.ok': 'Am înțeles',
    // — actions
    'action.copy': 'Copiază',
    'action.copied': 'Copiat',
    'action.share': 'Trimite',
    'share.problem': 'Problema',
    'share.signature': 'Rezolvat cu Rezolvo',
    'doc.you': 'Tu',
    'doc.readAs': 'Am citit',
    'doc.fix': 'Corectează',
    // — errors
    'err.network': 'Nu am ajuns la internet — verifică conexiunea și încearcă din nou.',
    'err.busy': 'Sunt puțin ocupat acum — așteaptă un moment și încearcă iar.',
    'err.unavailable': 'Serviciul AI nu e disponibil momentan — încearcă mai târziu.',
    'err.auth': 'Conectează-te din nou, apoi reîncearcă.',
    'err.generic': 'Ceva n-a mers la rezolvare. Încearcă din nou.',
    'err.camera': 'Nu am putut deschide camera — verifică permisiunea în Setări.',
    'err.retry': 'Încearcă din nou',
    'net.offline': 'Fără conexiune — verifică-ți internetul',
    'busy.wait': 'Pe rând — aștept răspunsul curent…',
    // — auth feedback
    'auth.signedInAs': 'Conectat ca {name}',
    'auth.signedOut': 'Deconectat',
    'auth.signIn': 'Conectare',
    'auth.carried': 'Ți-am adus munca salvată ({n})',
    'auth.migrateBlocked': 'Nu ți-am putut muta munca în acel cont — verifică internetul și încearcă din nou.',
    // — welcome (offline fallback gate)
    'welcome.tagline': 'Fotografiază orice problemă de mate — rezolvată și explicată pas cu pas.',
    'welcome.google': 'Continuă cu Google',
    'welcome.caption': 'Conectează-te ca să-ți salvezi problemele rezolvate în cont.',
    'welcome.guest': 'Continuă fără cont',
    // — history
    'history.title': 'Munca ta',
    'history.stat.solved': 'rezolvate',
    'history.stat.streak': 'zile la rând',
    'history.stat.streak.one': 'zi la rând',
    'history.section.today': 'Azi',
    'history.section.yesterday': 'Ieri',
    'history.section.week': 'Săptămâna aceasta',
    'history.section.earlier': 'Mai demult',
    'history.search': 'Caută în munca ta…',
    'history.all': 'Toate',
    'history.empty': 'Nimic încă — rezolvă o problemă și apare aici.',
    'history.noMatch': 'Nimic găsit.',
    'history.justNow': 'chiar acum',
    'history.deleted': 'Problemă ștearsă',
    'history.undo': 'Anulează',
    // — settings
    'settings.title': 'Setări',
    'settings.guest.title': 'Conectează-te ca să-ți salvezi munca',
    'settings.guest.sub': 'Păstrează-ți problemele rezolvate pe toate dispozitivele — 5 secunde cu Google.',
    'settings.deleted': 'Cont șters',
    'settings.section.prefs': 'Preferințe',
    'settings.section.legal': 'Legal',
    'settings.section.account': 'Cont',
    'settings.language': 'Limbă',
    'settings.language.value': 'Română',
    'settings.signOut': 'Deconectare',
    'settings.delete': 'Șterge contul',
    'settings.deleting': 'Se șterge contul…',
    'settings.deleteNote': 'Ștergerea elimină definitiv contul și toate problemele tale rezolvate.',
    'settings.deleteError': 'Nu am putut șterge contul — încearcă din nou.',
    'settings.confirm.title': 'Ștergi contul?',
    'settings.confirm.message':
      'Îți șterge definitiv contul și toate problemele rezolvate, de pe toate dispozitivele. Nu există anulare.',
    'settings.confirm.cta': 'Șterge definitiv',
    'settings.confirm.cancel': 'Anulează',
    'settings.privacy': 'Politica de confidențialitate',
    'settings.terms': 'Termeni și condiții',
    'a11y.send': 'Trimite',
    'a11y.stop': 'Oprește rezolvarea',
    'a11y.camera': 'Fotografiază',
    'a11y.delete': 'Șterge',
    'a11y.close': 'Închide',
    'a11y.torch': 'Lanternă',
    'a11y.shutter': 'Fă poza',
    // — in-app capture (camera visor + trim)
    'capture.title': 'Fotografiază',
    'capture.hint': 'Încadrează problema',
    'capture.warming': 'Pornesc camera…',
    'capture.lblGallery': 'Galerie',
    'capture.lblType': 'Scrie',
    'crop.hint': 'Trage colțurile ca să încadrezi problema',
    'capture.denied': 'Rezolvo are nevoie de cameră ca să fotografieze probleme. Activeaz-o în Setări.',
    'capture.allow': 'Permite camera',
    'capture.openSettings': 'Deschide setările',
    'capture.typeInstead': 'Scrie în loc',
    'crop.title': 'Alege problema',
    'crop.retake': 'Refă',
    'crop.chooseAnother': 'Alege alta',
    'crop.solve': 'Rezolvă',
  },
} as const

export type StringKey = keyof (typeof STRINGS)['en']

type I18nValue = {
  lang: Lang
  /** Human name of the language, for AI prompts ("Romanian"/"English"). */
  langName: string
  setLang: (l: Lang) => void
  t: (key: StringKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ro')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'en' || v === 'ro') setLangState(v)
      })
      .catch(() => {})
  }, [])

  const value = useMemo<I18nValue>(() => {
    const t = (key: StringKey, vars?: Record<string, string | number>) => {
      let s: string = STRINGS[lang][key] ?? STRINGS.en[key] ?? key
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
      return s
    }
    const setLang = (l: Lang) => {
      setLangState(l)
      AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {})
    }
    return { lang, langName: lang === 'ro' ? 'Romanian' : 'English', setLang, t }
  }, [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>')
  return ctx
}
