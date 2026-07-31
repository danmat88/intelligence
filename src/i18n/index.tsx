import { createContext, useContext, type ReactNode } from 'react'

/**
 * Romanian-only product catalog. The former English switch was intentionally
 * removed: every learner-facing surface and every AI answer now has one clear
 * language contract.
 */

export type Lang = 'ro'

const STRINGS = {
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
    'Profu’ de Mate a rulat calculul efectiv în cod (Python), iar rezultatul coincide cu răspunsul afișat. E o verificare de mașină — nu doar părerea AI-ului.',
  'common.ok': 'Am înțeles',
  // — actions
  'action.copy': 'Copiază',
  'action.copied': 'Copiat',
  'action.share': 'Trimite',
  'action.report': 'Raportează',
  'action.reported': 'Raport trimis — mulțumim',
  'share.problem': 'Problema',
  'share.signature': 'Rezolvat cu Profu’ de Mate',
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
  // — daily limit (the freemium moment: full quality, capped quantity)
  'limit.title': 'Ai folosit cele {n} rezolvări de azi',
  'limit.sub.guest': 'Intră cu Google — gratuit — și ai 5 rezolvări pe zi, cu munca salvată în contul tău.',
  'limit.sub.user': 'Premium scoate limita: rezolvări nelimitate, oricând ai nevoie.',
  'limit.cta.signin': 'Continuă cu Google — 5 pe zi',
  'limit.cta.premium': 'Vezi Premium',
  'limit.cta.premium.main': 'Treci la Premium — nelimitat',
  'limit.tomorrow': 'Se resetează la miezul nopții — pe mâine.',
  'limit.chat.title': 'Ai folosit cele {n} întrebări la problema asta azi',
  'limit.chat.sub': 'Premium face întrebările nelimitate. Între timp poți porni o problemă nouă — sau revino mâine.',
  // — usage pill (today's metered solves, from the proxy's response headers)
  'usage.pill': '{used}/{limit} azi',
  'usage.info': 'Rezolvări gratuite azi: {used}/{limit} — se resetează la miezul nopții.',
  'usage.last': 'Asta a fost ultima rezolvare gratuită pe azi.',
  // — paywall
  'paywall.benefit.unlimited': 'Rezolvări nelimitate — pași compleți, verificate',
  'paywall.benefit.chat': 'Întrebări nelimitate la fiecare problemă',
  'paywall.benefit.mistake': 'Ajutor contextual pentru identificarea greșelii',
  'paywall.plan.monthly': 'Lunar',
  'paywall.plan.yearly': 'Anual',
  'paywall.plan.weekly': 'Săptămânal',
  'paywall.per.monthly': '/ lună',
  'paywall.per.yearly': '/ an',
  'paywall.per.weekly': '/ săptămână',
  'paywall.trial': '3 zile gratuit, apoi facturat anual',
  'paywall.note.yearly': '≈ 10 lei / lună',
  'paywall.badge.best': 'CEL MAI AVANTAJOS',
  'paywall.cta': 'Continuă',
  'paywall.soon': 'Plățile se activează foarte curând — planul va fi disponibil chiar aici.',
  'paywall.restore': 'Restaurează achizițiile',
  'paywall.legal': 'Anulezi oricând din Google Play.',
  'paywall.already': 'Ești Premium — rezolvări nelimitate, pași compleți, verificate.',
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
  'capture.denied': 'Profu’ de Mate are nevoie de cameră ca să fotografieze probleme. Activeaz-o în Setări.',
  'capture.allow': 'Permite camera',
  'capture.openSettings': 'Deschide setările',
  'capture.typeInstead': 'Scrie în loc',
  'crop.title': 'Alege problema',
  'crop.retake': 'Refă',
  'crop.chooseAnother': 'Alege alta',
  'crop.solve': 'Rezolvă',
} as const

export type StringKey = keyof typeof STRINGS

type I18nValue = {
  lang: Lang
  t: (key: StringKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const t = (key: StringKey, vars?: Record<string, string | number>) => {
    let value: string = STRINGS[key] ?? key
    if (vars) {
      for (const [name, replacement] of Object.entries(vars)) {
        value = value.replaceAll(`{${name}}`, String(replacement))
      }
    }
    return value
  }
  const value: I18nValue = { lang: 'ro', t }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n trebuie folosit în interiorul <I18nProvider>')
  return ctx
}
