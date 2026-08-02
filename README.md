# Profu’ de Mate

Aplicație mobilă de matematică pentru trei contexte: Evaluarea Națională,
Bacalaureat și utilizare fără obiectiv de examen. Utilizatorul poate trimite o
problemă prin text sau fotografie, confirma enunțul și alege ajutor ghidat,
verificarea propriei lucrări ori soluția completă.

## Dezvoltare locală

Proiectul folosește Expo SDK 54, React Native, TypeScript și un development
client Android.

```bash
npm install
npm run dev:client
```

Pentru verificarea completă:

```bash
npm test -- --runInBand
npm run test:rules
npm --prefix functions run build
npx expo-doctor
```

## Arhitectură

- `src/solve` — citirea fotografiei, cele trei moduri de ajutor și verificarea;
- `src/practice` — exerciții EN/BAC, exerciții libere și rezultate bazate numai
  pe activitate reală;
- `src/archive` — registrul surselor oficiale și conținut interactiv publicat
  numai după verificare editorială integrală;
- `src/product` — profilul de onboarding și obiectivul curent;
- `functions` — proxy AI autentificat, limite server-side, export, ștergere de
  cont și integrarea entitlement-urilor;
- `firestore.rules` / `storage.rules` — izolare strictă a datelor sub UID.

Firebase Authentication pornește cu o sesiune anonimă, astfel încât aplicația
nu blochează utilizatorul într-un ecran de cont. Conectarea ulterioară cu Google
păstrează sau transferă datele sesiunii.

## Configurare

Valorile publice acceptate sunt documentate în `.env.example`. Cheia Gemini nu
se pune în aplicație: este secret Firebase Functions (`GEMINI_API_KEY`), iar
clientul folosește numai `EXPO_PUBLIC_AI_PROXY_URL`.

App Check rămâne în monitorizare în development. Enforcement-ul se activează
numai după configurarea certificatelor reale de release și verificarea
metricilor unui build semnat.

Contractul curent al produsului și modelul de date sunt în
[`docs/CODEX-PLAN.md`](docs/CODEX-PLAN.md).
