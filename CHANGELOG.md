# Changelog

Toutes les modifications notables de CYNES Reporting sont documentées ici.

Le format s’inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le projet suit le [versionnement sémantique](https://semver.org/lang/fr/).

## [Unreleased]

### Added

- Mode de simulation locale pour tester le parcours d’envoi sans expédier d’e-mail.
- Copie interne invisible envoyée séparément avec un objet dédié.

### Changed

- Le formulaire d’envoi par e-mail laisse place à une confirmation visuelle après un envoi réussi.
- Le message par défaut mentionne le mois du rapport et intègre la signature de l’équipe CYNES.
- La mention technique du compte et des dates ISO a été retirée du corps de l’e-mail.

### Fixed

- Mise à niveau de sécurité de Next.js 16.4.0 vers 16.4.5.

## [0.2.0] - 2026-11-04

### Added

- Gestion de plusieurs comptes Instagram avec tokens chiffrés dans SQLite.
- Adresse e-mail client associée à chaque compte Instagram.
- Envoi du rapport PDF par e-mail via SMTP.
- Analyse éditoriale du rapport générée avec l’API OpenAI.
- Aperçu PDF intégré au dashboard avec mémorisation du dernier rapport.
- Historique mensuel des performances et Top 3 des contenus.
- Déploiement Docker automatisé sur le VPS avec GitHub Actions.

### Changed

- Rapport PDF réparti sur deux pages avec pagination explicite.
- Vue d’ensemble rééquilibrée avec des KPI plus lisibles.
- Définitions des indicateurs regroupées sous forme de liste à puces.
- Deux premiers graphiques conservés sur la première page.
- Quatre graphiques restants et Top contenus regroupés sur la deuxième page.

### Fixed

- Isolation des services Docker de CYNES Reporting et My Wallet Finance.
- Installation de Playwright et Chromium dans l’image de production.
- Fermeture des explications au clic extérieur.
- Affichage invalide du nombre total de followers.

## [0.1.0] - 2026-11-03

### Added

- Première version du dashboard CYNES Reporting.
- Récupération des statistiques réelles via l’API Instagram officielle.
- KPI, graphiques Recharts et génération du rapport PDF avec Playwright.

[Unreleased]: https://github.com/cyril-philippart/reporting-insta/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/cyril-philippart/reporting-insta/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/cyril-philippart/reporting-insta/releases/tag/v0.1.0
