# Rezolvo — Stadiu & pași rămași

> Actualizat: 2026-07-11. Planul de produs complet e în [PLAN.md](PLAN.md);
> aici e starea la zi: ce e livrat și ce urmează, în ordinea recomandată.

## ✅ Făcut și livrat (verificat pe telefon)

- ✅ **Pivotul complet**: din chat generic → **Rezolvo**, solver de matematică camera-first, RO-first cu EN din prima zi
- ✅ **Backend serios**: Firebase Auth fără barieră (guest anonim → link Google fără pierdere de date), Firestore per-problemă, funcție cloud cu cheia ascunsă server-side + rate limit (20/min user, 5/min guest)
- ✅ **Viteză de competitor**: rutare FAST/DEEP măsurată (~2–4s pe probleme școlare, escaladare automată pe probleme grele)
- ✅ **Motorul de corectitudine**: verificare cu cod real (sympy, code execution) în fundal → badge „✓ Verificat", re-rezolvare automată cu modelul mare când verificarea pică
- ✅ **Cardul de soluție ca-n manual**: pași KaTeX numerotați (tap → re-explicare), cutie de răspuns, grafic pentru gradul 2, „Problemă similară", „Am scris-o greșit"
- ✅ **Camera și crop-ul ÎN aplicație**: vizor propriu cu cadru de ghidaj + lanternă, decupare cu mânere, navigare care respectă originea (galerie ≠ cameră), zero UI de sistem
- ✅ **Anti-halucinație**: poză ilizibilă → refuz politicos în română, nu problemă inventată (testat cu poză neagră)
- ✅ **Tastatura civilizată peste tot** + sheet-ul de istoric care se ridică deasupra ei
- ✅ **Mișcare premium**: cross-fade-uri, cardul soluției care crește lin, scale+spring pe fiecare buton, skeleton animat cât gândește AI-ul
- ✅ **Appeal**: gradient de brand (buton trimis, bule, lentilă), watermark ∫, salut personal
- ✅ **Istoric** (streak, căutare, filtre pe subiecte) + **Setări** (limbă RO/EN, legal, ștergere cont conform Play)
- ✅ **Pagini legale live** pe rezolvo.web.app (bilingv)
- ✅ **Rebrand tehnic complet**: com.rezolvo.app, Firebase curat, build local funcțional (rețeta CMake în CLAUDE.md)

## ⬜ De făcut (în ordinea recomandată)

### Perfecțiune — stratul 2 (scurt, tehnic)
- ⬜ KaTeX împachetat local (acum vine de pe CDN → istoricul nu se randează offline)
- ⬜ Audit warninguri Metro + curățenie finală

### Feature-ul erou + practică
- ⬜ **„Găsește-mi greșeala"**: elevul pozează REZOLVAREA lui, Rezolvo arată exact pasul greșit — diferențiatorul principal
- ⬜ Confirmă-ce-am-citit la poze (afișăm problema citită, userul confirmă — schema are deja câmpul `problem`)
- ⬜ Grafice generalizate (nu doar parabole)
- ⬜ Mod Practică (serii de probleme similare, nu doar chip-ul unu-la-unu)

### Bani — freemium 💰
- ⬜ Limită zilnică server-side (ex. 5 rezolvări gratuite/zi)
- ⬜ Paywall elegant (pașii blurați + „Deblochează cu Premium")
- ⬜ RevenueCat + Google Play Billing, abonament (~15–25 lei/lună — de decis)

### Identitate vizuală
- ⬜ **Logo/iconiță Rezolvo** — launcher-ul încă arată sigla veche „Intelligence"! (concepte parcate: triunghiul lui Pitagora vs √ ca bifă)
- ⬜ Splash cu noua siglă

### Lansare Play Store 🚀
- ⬜ Cont Google Play Console — **25$, partea userului**
- ⬜ Build de producție semnat (cota EAS revine ~1 august; SHA-ul noului keystore → Firebase + Play App Signing)
- ⬜ Formular Data Safety + content rating
- ⬜ Listing RO/EN: screenshots, feature graphic, descriere
- ⬜ Internal testing → producție

### După lansare
- ⬜ Notificări + repetare spațiată (retenție)
- ⬜ Distribuție TikTok (partea userului — demo-uri cu probleme rezolvate live)
- ⬜ Eventual domeniu + email de brand (schimbul e 5 minute, nu blochează nimic; contact curent: mathosting@gmail.com)

**Următoarea sesiune recomandată:** logo-ul + „Găsește-mi greșeala" — unul dă fața aplicației, celălalt argumentul de vânzare.
