# Profu’ de Mate — auditul reconstrucției produsului

Data: 29 iulie 2026

Acest audit privește stratul de produs și interfața. Contractele tehnice
validate (autentificare, stocare, metering, verificare, raportare și motorul AI)
se păstrează, dar nu dictează structura vizibilă a aplicației.

## Verdict

Implementarea curentă nu este refactorul complet descris în
`docs/CODEX-PLAN.md`. Este o carcasă nouă montată peste o mare parte din
prezentarea și proprietatea de stare veche.

Semnalele obiective:

- `SolverScreen.tsx` are 1.435 de linii și deține intrarea, conversația,
  camera, persistența, verificarea, limitele și paywall-ul;
- `ThreadDocument.tsx` are 814 linii, iar `CaptureScreen.tsx` 824;
- Acasă și Pregătire sunt compuse din grile de carduri care duplică
  navigația și fragmentează ierarhia;
- interfața folosește frecvent text de 8–11 px și controale compacte, improprii
  unei aplicații educaționale accesibile;
- mai multe acțiuni din Pregătire sunt doar promisiuni care afișează toast-uri,
  nu destinații sau stări de produs reale;
- există simultan texte românești hardcodate și un catalog englezesc complet;
- setările, limita, paywall-ul, autentificarea și stările de eroare nu au fost
  reconstruite în același sistem de produs;
- structura vizibilă a solverului rămâne dependentă de un singur ecran
  monolitic, deși planul cere separarea sesiunii de rută și prezentare.

## Ce se păstrează

Se păstrează numai comportamentul demonstrat și contractele de date:

- autentificarea anonimă și migrarea sigură către Google;
- stocarea idempotentă a problemelor și imaginilor;
- motorul solve / follow-up / verify și prompturile românești;
- metering-ul server-side, App Check, analytics și raportarea non-fatală;
- sanitizarea matematicii, graficele, figurile și exportul;
- anularea cererilor și protecția la schimbarea contului sau problemei.

Păstrarea acestor contracte nu înseamnă păstrarea ecranelor care le folosesc.

## Ce se înlocuiește

1. Întregul chrome: antet, navigație, headere contextuale și sistemul de
   overlay.
2. Toate suprafețele vizibile: pornire, autentificare, Acasă, Pregătire,
   Caiet, Rezolvă, cameră/revizuire, soluție, setări, limită, abonament,
   dialoguri, toast-uri, erori și stări goale.
3. Grilele uniforme de carduri, textele microscopice, decorațiile repetate și
   butoanele fără destinație reală.
4. Monolitul solverului, împărțit în:
   - stare și orchestrare de sesiune;
   - alegerea sursei;
   - editor matematic;
   - captură și revizuire;
   - document de soluție;
   - compozitor de întrebări;
   - limite și erori.
5. Catalogul englezesc și orice fallback vizibil în engleză.

## Arhitectura țintă

- `app/`: boot, provideri și gazda unică de overlay;
- `navigation/`: patru destinații de navigare, acțiunea centrală Rezolvă și
  fluxuri focusate separate;
- `design/`: token-uri, tipografie, iconuri și primitive fără logică de produs;
- `features/home/`, `features/preparation/`, `features/notebook/`;
- `features/solver/session/`: orchestrare fără JSX de ecran;
- `features/solver/input/`, `capture/`, `solution/`;
- `features/account/`, `limits/` și `billing/`;
- `services/`: contractele existente AI, Firebase, analytics și stocare.

## Reguli de acceptare

- niciun ecran din versiunea respinsă nu rămâne montat sau accesibil;
- nicio acțiune vizibilă nu este un toast care promite o funcție inexistentă;
- textul de corp este lizibil, controalele au ținte de minimum 44 dp și
  font-scaling-ul nu rupe traseele principale;
- Azi, Subiecte, Exersează și Caiet au același antet și aceeași geometrie;
- Rezolvă este flux focusat, nu tab și nu chat generic;
- toate textele și toate răspunsurile AI sunt în română;
- ecranele goale sunt sincere și nu inventează progres sau conținut;
- back, tastatură, safe area, offline și captură sunt verificate pe telefon;
- TypeScript, testele, buildul Android și fiecare traseu vizibil trec înainte
  ca reconstrucția să fie declarată terminată.

## Remediere în curs — 29 iulie 2026

După audit au fost aplicate următoarele limite structurale:

- navigația duplicată de pe Azi a fost eliminată;
- Subiecte deschide direct modul Studiază, Ghidat sau Simulare;
- ajutorul profesorului rămâne în exercițiul activ și folosește contextul
  exact al elevului;
- selectorul sursei și editorul problemei au fost extrase din prezentarea
  monolitică a solverului;
- grila de răspunsuri, figura nativă, profesorul și rezolvarea unui subiect
  oficial sunt componente separate;
- antetele, controalele segmentate, acțiunile principale, progresul și stările
  goale folosesc primitive comune;
- recomandările, greșelile și lucrările neterminate duc la activitatea exactă,
  nu la un tab generic;
- paleta violet moștenită a fost eliminată din soluții, grafice, toast-uri,
  panouri și vizorul camerei.

Auditul rămâne deschis. `SolverScreen`, `CaptureScreen` și documentul de soluție
mai necesită separarea orchestrării de prezentare și verificare pe dispozitiv.

## Remediere verificată pe dispozitiv — 29 iulie 2026

Auditul real pe telefonul 1080 × 2400 a identificat și a remediat:

- cauza comună a elementelor tăiate: componenta animată `Press` aplica
  dimensiunile și `flex` pe un copil, nu pe elementul din layout; grila de
  răspunsuri, butoanele de back și acțiunile de jos sunt din nou măsurate
  corect;
- simbolurile matematice lipsă din editor au fost înlocuite cu etichete
  lizibile într-un font de sistem cu acoperire matematică;
- editorul scris și bara matematică încap deasupra tastaturii;
- exercițiile de antrenament și subiectele oficiale au acțiune persistentă,
  safe area corect și protecție față de tastatura Android;
- Azi are un singur pas recomandat și două scurtături contextuale compacte;
- Exersează separă Antrenament de Simulare și afișează un singur CTA;
- Caiet ascunde căutarea inutilă pentru liste foarte scurte și afișează titluri
  de probleme orientate spre elev;
- solicitările contextuale vechi salvate accidental în solver sunt curățate
  numai la afișare, fără ștergerea sau rescrierea istoricului;
- documentul de soluție a fost verificat cu enunț, pași, răspuns verificat și
  compozitor de întrebări vizibile.
- vizorul camerei a fost verificat pe dispozitiv și adus în paleta comună
  verde-cretă, crem și galben; accesul la cameră, galerie și editor rămâne
  disponibil în același flux.

Auditul rămâne deschis pentru lățimea reală de conținut EN/BAC, etapa de crop,
stările offline și separarea finală a orchestrării din `SolverScreen`.
