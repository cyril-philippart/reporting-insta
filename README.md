# CYNES Reporting

Dashboard interne de reporting Instagram affichant simultanément les vues, la couverture, les interactions, les nouveaux followers, les visites et les clics sur un lien.

L’historique des versions est disponible dans le [changelog](./CHANGELOG.md).

Le rapport inclut également les trois publications, carrousels ou Reels publiés dans la période qui totalisent actuellement le plus de vues.

## Configuration

1. Copier `.env.example` vers `.env.local`.
2. Renseigner `CYNES_ADMIN_PASSWORD` avec le mot de passe de l’administration.
3. Générer `CYNES_ENCRYPTION_KEY` avec une valeur aléatoire d’au moins 32 caractères. Ne plus modifier cette clé après l’ajout des comptes.
4. Installer Chromium pour la génération PDF : `npx playwright install chromium`.

Les comptes Instagram se gèrent ensuite depuis **Gérer les comptes** dans l’en-tête. Le serveur vérifie chaque token auprès de Meta, puis l’enregistre chiffré dans SQLite. `INSTAGRAM_ACCESS_TOKEN` reste uniquement un secours de migration et peut être retiré une fois le compte ajouté depuis l’interface.

Le token est lu uniquement par `src/lib/instagram/client.ts`. Il ne doit jamais être préfixé par `NEXT_PUBLIC_`.

## Commandes

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

Le serveur de développement est disponible sur [http://localhost:3000](http://localhost:3000).

## Architecture

- `src/components` : dashboard et graphique Recharts.
- `src/lib/instagram` : client Graph API, récupération groupée des métriques, breakdown des nouveaux followers, limitation de concurrence et normalisation.
- `src/lib/reporting` : périodes, calculs statistiques et types partagés.
- `src/lib/pdf` : document A4 généré côté serveur.
- `src/app/api/instagram/insights` : façade sécurisée vers Meta.
- `src/app/api/report/pdf` : génération du PDF avec Playwright.

Les dates de l’interface sont inclusives. Le service convertit la fin vers la borne `until` exclusive attendue par Meta. Une journée absente reste `null` et n’est jamais inventée comme valant zéro. La période demandée et sa période de comparaison doivent rester dans les 90 jours de rétention des insights utilisateur.
