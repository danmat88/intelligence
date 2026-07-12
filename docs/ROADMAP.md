# Rezolvo — Stadiu & plan

> Actualizat: 2026-07-12. Planul de produs complet e în [PLAN.md](PLAN.md);
> aici e starea la zi: ce e livrat și ce urmează, în ordinea recomandată.

## ✅ Făcut și livrat (verificat pe telefon)

### Fundația (sesiunile anterioare)
- ✅ **Pivotul complet**: din chat generic → **Rezolvo**, solver de matematică camera-first, RO-first cu EN din prima zi
- ✅ **Backend serios**: Firebase Auth fără barieră (guest anonim → link Google fără pierdere de date), Firestore per-problemă, funcție cloud cu cheia ascunsă server-side + rate limit (20/min user, 5/min guest)
- ✅ **Viteză de competitor**: rutare FAST/DEEP măsurată (~2–4s pe probleme școlare, escaladare automată pe probleme grele)
- ✅ **Motorul de corectitudine**: verificare cu cod real (sympy) în fundal → badge „✓ Verificat", re-rezolvare automată cu modelul mare când verificarea pică
- ✅ **Anti-halucinație**: poză ilizibilă → refuz politicos, nu problemă inventată
- ✅ **Pagini legale live** pe rezolvo.web.app (bilingv) + ștergere de cont conform Play
- ✅ **Rebrand tehnic complet**: com.rezolvo.app, Firebase curat, build local funcțional

### Redesign + sistemul de mișcare (2026-07-11)
- ✅ **Look nou**: blurple electric #6355FF pe hârtie caldă #F7F6F2, gradient violet→indigo, Space Grotesk pe display, zero emoji în UI (icon-tile-uri Feather)
- ✅ **Layouturi reconstruite**: History (stat tiles, grupare pe zile, carduri cu icon-tile), Settings (secțiuni etichetate, danger zone), hero (CTA pe gradient), dialog de confirmare, cardul de soluție (pași cu tile-uri numerotate)
- ✅ **Contract de mișcare v2**: push opac peste tot (fără zoom+opacity, fără snappy — 460–560ms, bezier cu coadă moale), pe UI-thread (Reanimated) → nimic nu mai poate îngheța tranzițiile
- ✅ **Flow secvențial**: o singură mișcare grea o dată (sheet aterizează → apoi lista; sheet iese → apoi thread-ul)

### Ecranul de problemă + KaTeX local (2026-07-11/12)
- ✅ **KaTeX + marked + fonturile ÎN aplicație** (file://, offline, fără CDN; CDN doar fallback)
- ✅ **Contractul de chat**: conversația se deschide ancorată JOS instant (ca ChatGPT/WhatsApp), degetul userului e șeful, răspunsul live nu smucește scroll-ul
- ✅ **Carduri inerte la citire**: înălțimi persistate pe disc, estimare care subestimează, WebView montat după tranziție, pagina construită O DATĂ + update-uri injectate (fără reload-flash)
- ✅ **Push conversație → conversație** cu haptic la selecție; tap pe conversația deschisă = doar închide sheet-ul
- ✅ **History panel**: înălțime FIXĂ (nu se mai redimensionează la încărcare), schelet-oglindă, ștergere cu slide-out + **Anulează** pe toast

### Cameră, boot, release (2026-07-11/12)
- ✅ **Camera „lens-opening"**: visorul urcă gol → camera pornește la aterizare → ghidajele se ridică pe feed; blitz la captură; la ieșire camera se stinge întâi
- ✅ **Crop profesionist**: bracket-uri L + mânere pe laturi + haptic la apucare + bara „Obturator" (discul declanșator ÎN butonul Rezolvă, devine spinner la procesare)
- ✅ **Delogare fără splash**: rămâi în app, munca se curăță în pagină, avatarul se schimbă, toast
- ✅ **Splash nativ gol** (doar hârtia caldă, icon transparent) → brand beat-ul JS desenează sigla → app-ul intră — o singură scenă
- ✅ **Release APK local funcțional** (Hermes optimizat, cheia Gemini EXCLUSĂ din bundle, fix-ul de nume asset-uri documentat)

### Pachetul A — flow-ul în timpul acțiunilor (2026-07-12)
- ✅ **Race-uri reparate**: switch de conversație / delogare anulează rezolvarea în zbor (răspunsul vechi nu mai poate suprascrie contextul nou)
- ✅ **Send → Stop** în composer (pattern ChatGPT); la Stop întrebarea revine în composer
- ✅ **Retry pe eroare**: „Încearcă din nou" re-trimite exact cererea eșuată
- ✅ **Pastila de offline** deasupra composer-ului (event-driven; listener nativ vine la lotul de build-uri)

## ⬜ De făcut (în ordinea recomandată)

### B. Identitate vizuală — URMĂTORUL
- ⬜ **Logo/iconiță Rezolvo** — launcher-ul încă arată sigla veche „Intelligence"! (concepte parcate: triunghiul lui Pitagora vs √ ca bifă)
- ⬜ Icon adaptiv Android (foreground/background/monochrome) + brand beat cu noua siglă
- ⬜ Culoarea `iconBackground` din colors.xml aliniată noii sigle

### C. Bani — freemium 💰 (blocant pentru lansarea reală)
- ⬜ **Decizii de produs (Dan)**: câte rezolvări gratuite/zi? preț abonament (~15–25 lei/lună)?
- ⬜ Limită zilnică **server-side** în proxy (clientul nu poate fi păcălit)
- ⬜ Paywall elegant (pașii blurați + „Deblochează cu Premium")
- ⬜ Google Play Billing / RevenueCat (modul nativ → lot de build: + NetInfo pentru offline real)

### Feature-ul erou + practică
- ⬜ **„Găsește-mi greșeala"**: elevul pozează REZOLVAREA lui, Rezolvo arată exact pasul greșit — diferențiatorul principal
- ⬜ Confirmă-ce-am-citit la poze (afișăm problema citită, userul confirmă — schema are deja câmpul `problem`)
- ⬜ Grafice generalizate (nu doar parabole)
- ⬜ Mod Practică (serii de probleme similare, nu doar chip-ul unu-la-unu)

### D. Creștere + retenție
- ⬜ **Momente de celebrare**: sweep + haptic când răspunsul iese „✓ Verificat"
- ⬜ **Share ca imagine**: card de soluție brand-uit de aruncat în grupul clasei (viral loop; azi share-ul e text sec)
- ⬜ Prompt de rating în Play după a N-a rezolvare verificată
- ⬜ Onboarding scurt la prima deschidere (limbă, clasă, primul solve ghidat)

### E. Calitate & vizibilitate
- ⬜ Dark mode (tokens centralizați + visor deja dark → efort mediu)
- ⬜ Firebase Analytics pe evenimentele cheie (solve, verify, share, paywall)
- ⬜ Streak-ul vizibil în header, nu doar în History
- ⬜ Audit warninguri Metro + curățenie finală

### Lansare Play Store 🚀
- ⬜ Cont Google Play Console — **25$, partea userului**
- ⬜ Build de producție semnat (cota EAS revine ~1 august; SHA-ul noului keystore → Firebase + Play App Signing)
- ⬜ Formular Data Safety + content rating
- ⬜ Listing RO/EN: screenshots, feature graphic, descriere
- ⬜ Internal testing (APK-ul de release există deja pentru prieteni) → producție

### După lansare
- ⬜ Notificări + repetare spațiată (retenție)
- ⬜ Distribuție TikTok (partea userului — demo-uri cu probleme rezolvate live)
- ⬜ Galerie custom / bandă de poze recente în cameră (parcată conștient: policy risk pe READ_MEDIA_IMAGES)
- ⬜ Eventual domeniu + email de brand (contact curent: mathosting@gmail.com)

**Următoarea sesiune recomandată:** B (logo-ul — 30 min de decizie + implementare) și apoi discuția de prețuri pentru C.
