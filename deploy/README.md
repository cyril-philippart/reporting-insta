# Déploiement de CYNES Reporting

L'application est publiée sur `https://reporting-insta.cynes.fr`. Elle partage
le reverse proxy Caddy et le réseau Docker `deploy_frontend` de My Wallet.

## 1. DNS

Créer un enregistrement `A` pour `reporting-insta.cynes.fr` vers l'adresse IPv4
du VPS. Ajouter un enregistrement `AAAA` uniquement si le VPS possède une IPv6
publique correctement configurée.

## 2. Secrets GitHub

Configurer dans le dépôt `cyril-philippart/reporting-insta` les mêmes secrets
de déploiement que pour My Wallet :

- `PROD_HOST`
- `PROD_USER`
- `PROD_SSH_PRIVATE_KEY`

Ajouter aussi la variable d'environnement GitHub `REPORTING_DOMAIN` avec la
valeur `reporting-insta.cynes.fr`.

## 3. Configuration du VPS

Créer `/opt/apps/cynes-reporting/deploy/.env.production` à partir de
`.env.production.example`. Les valeurs sensibles ne doivent jamais être
ajoutées au dépôt Git.

Les valeurs indispensables sont :

- `CYNES_ADMIN_PASSWORD`
- `CYNES_ENCRYPTION_KEY` (conserver exactement la même clé dans le temps)
- `OPENAI_API_KEY`

Les jetons Instagram sont ensuite ajoutés depuis l'interface d'administration.

Le registre GHCR doit être accessible depuis le VPS. Pour une image privée :

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u cyril-philippart --password-stdin
```

## 4. Reverse proxy

Le fichier Caddy de My Wallet contient le bloc `reporting-insta.cynes.fr` et
son réseau Compose porte explicitement le nom `deploy_frontend`. Redéployer My
Wallet une fois pour appliquer cette configuration, puis déployer CYNES.

## 5. Déploiements suivants

Chaque push sur `main` lance les tests, construit l'image Docker, la publie sur
GHCR puis redémarre CYNES sur le VPS. La base SQLite reste dans le volume Docker
`reporting_data` et n'est pas remplacée lors d'un déploiement.
