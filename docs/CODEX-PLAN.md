# Rezolvo — contractul produsului

Acest document a fost refăcut de la zero după eliminarea planurilor vechi. Este contractul curent al produsului și trebuie actualizat numai când se schimbă o decizie reală.

## Promisiunea produsului

Rezolvo ajută un utilizator să rezolve și să înțeleagă o problemă de matematică. Un obiectiv opțional de examen adaugă pregătire structurată pentru Evaluarea Națională sau BAC; nu limitează rezolvitorul.

Aplicația nu este un manual de tocit. Bucla principală este:

1. utilizatorul fotografiază sau scrie problema;
2. confirmă enunțul extras;
3. alege ajutor ghidat, rezolvare completă sau verificarea lucrării proprii;
4. primește feedback exact și, la cerere, un exercițiu asemănător;
5. activitatea este salvată sub UID-ul Firebase curent.

## Profilul utilizatorului

Nu există tipuri exclusive de utilizatori. Există un profil cu obiectiv opțional:

- Evaluarea Națională;
- BAC și un profil obligatoriu: mate-info, științe ale naturii, tehnologic sau pedagogic;
- fără obiectiv de examen.

Nu cerem clasa unui utilizator fără examen. Alegerea poate fi schimbată ulterior fără pierderea istoricului.

## Onboarding

Onboardingul nu cere cont și nu blochează o problemă urgentă. Firebase Authentication creează o sesiune anonimă înaintea produsului.

1. Promisiunea aplicației și acțiunea `Rezolvă acum`.
2. Întrebarea `Pentru ce vrei să te pregătești?`: EN, BAC sau fără examen.
3. Numai pentru BAC: alegerea profilului.
4. Intrare directă în aplicație. Evaluarea inițială este opțională și apare ulterior, nu în onboarding.

## Conținut

### Fără examen

- rezolvare prin fotografie sau text;
- ajutor ghidat, soluție completă și verificarea lucrării;
- istoric, salvări și exerciții similare;
- statistici descriptive despre activitatea reală, fără procent de programă sau „nivel” inventat.

### EN/BAC

Include toate funcțiile universale, plus:

- exerciții organizate în spate după programa oficială;
- seturi țintite și evaluări mixte;
- subiecte oficiale cu an, sesiune, sursă și barem;
- mod ghidat, mod de studiu și simulare fără ajutor până la predare;
- rezultate pe barem și recomandări bazate pe greșelile observate.

Nu există pagini lungi de „materie”. Metodele și formulele apar scurt, în contextul exercițiului.

Un subiect nu apare ca experiență interactivă până când enunțul, figurile, baremul și metadatele lui nu au fost transcrise și verificate integral. Până atunci aplicația poate afișa numai pachetul-sursă oficial verificat; nu completează golurile cu exerciții inventate.

## Rezultate, nu procente inventate

Un profil EN/BAC nou este `neevaluat`, nu `0%`. După prima evaluare există un nivel inițial numai pentru ariile acoperite. Evoluția apare doar după minimum două evaluări comparabile.

Se afișează separat:

- punctajul unei evaluări;
- acoperirea: ce arii au fost efectiv evaluate;
- situația pe arii, împreună cu încrederea datelor;
- tendința în timp, numai când există suficiente date.

Încercările cu indicii sau soluție AI sunt marcate `asistate` și nu demonstrează performanță independentă. Punctajul determinist este separat de estimarea AI pentru lucrări scrise.

## Navigație

Navigația arată destinații reale, nu scurtături duplicate de ecranul Acasă.

Pentru EN/BAC:

- `Acasă`: continuarea exactă și următoarea acțiune utilă;
- `Exerciții`: lucru țintit pe tipuri de cerințe;
- `Rezolvă`: acțiune globală, vizibilă permanent;
- `Subiecte`: subiecte oficiale, seturi și simulări;
- `Rezultate`: evaluări, arii acoperite, greșeli și evoluție.

Pentru utilizarea fără examen:

- `Acasă`: intrarea rapidă și continuarea ultimei probleme;
- `Exerciții`: exerciții similare sau un subiect ales explicit de utilizator;
- `Rezolvă`: acțiunea principală;
- `Istoric`: toate problemele și conversațiile;
- `Salvate`: colecția aleasă explicit de utilizator.

Setările și contul se deschid din avatar și nu ocupă o destinație principală.

## Firebase — model curat, fără migrare legacy

Toate datele private sunt sub UID:

```text
users/{uid}                              # entitlement server-only, client read-only
users/{uid}/profile/learning             # onboarding și obiectiv
users/{uid}/problems/{problemId}          # probleme, conversații și marcaj salvat
users/{uid}/practiceAttempts/{attemptId}  # exerciții și teste
  /responses/{exerciseId}                 # răspuns + corectitudine + ajutor folosit
users/{uid}/paperAttempts/{attemptId}     # subiecte oficiale
  /responses/{exerciseId}                 # răspuns + ajutor folosit
```

Fișierele private sunt în `users/{uid}/...` în Storage. Conținutul oficial publicat este separat de datele utilizatorilor, versionat, cu proveniență și fără scriere din client.

Firestore și Storage refuză accesul între UID-uri și validează forma fiecărui document. Contoarele de utilizare, entitlement-urile și agregările de rezultate sunt scrise numai de server.

Ștergerea contului elimină Authentication, întregul arbore Firestore, fișierele Storage, contoarele server și cache-urile locale. Exportul include profilul, toate documentele descendente și linkuri temporare pentru fișiere. Exportul și ștergerea sunt disponibile și pentru sesiunea anonimă. Transferul guest → cont existent copiază recursiv toate subcolecțiile și păstrează profilul deja existent în contul destinație.

Analytics și Crashlytics sunt oprite implicit și pornesc numai cu acord separat din Setări. În dezvoltare, App Check validează și înregistrează tokenurile fără să blocheze cererile; enforcement-ul devine obligatoriu numai prin configurare explicită după confirmarea metricilor unui build legitim.

## Condiții obligatorii înainte de release

- în Firebase Console se înregistrează Play Integrity pentru semnătura reală de release și App Attest/DeviceCheck pentru iOS, apoi se validează un build semnat înainte de activarea enforcement-ului global;
- se confirmă identitatea juridică, adresa și datele de contact ale operatorului din documentele legale;
- funcțiile, regulile și indexurile se publică împreună cu build-ul care folosește schema curentă; nu există compatibilitate promisă cu baza legacy;
- un subiect oficial interactiv se publică numai după control editorial complet, inclusiv figurile și baremul.

## Ordinea implementării

1. profil UID-scoped, reguli și teste;
2. onboarding și boot fără flash de conținut greșit;
3. navigație și ecrane diferențiate;
4. stocarea încercărilor și calculul rezultatelor;
5. pipeline pentru conținut oficial verificat;
6. securitate AI, App Check, export și ștergere;
7. teste end-to-end, build și audit de lansare.
