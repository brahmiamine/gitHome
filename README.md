# GitHome

GitHome est un dashboard personnel **100 % frontend** pour suivre tous les repositories GitHub accessibles à un compte : publics, privés, Pull Requests, Actions, déploiements, GitHub Pages, releases, commits, langages et métadonnées.

## Stack

- React 19
- TypeScript
- Vite
- GitHub REST API
- GitHub Primer / Octicons
- GitHub Pages

## Lancer en local

```bash
npm install
npm run dev
```

## Accès aux repositories privés

L'application n'utilise volontairement aucun backend. Pour accéder aux repositories privés, GitHome demande un **fine-grained personal access token** directement dans l'interface.

Le token est conservé uniquement dans `sessionStorage`. Il n'est jamais inclus dans le bundle, dans le repository ou dans une variable Vite.

Permissions recommandées pour les repositories sélectionnés :

- **Metadata: Read**
- **Contents: Read**
- **Pull requests: Read**
- **Actions: Read**
- **Deployments: Read**
- **Pages: Read** si disponible pour le token

Les endpoints non autorisés sont ignorés proprement : le reste du dashboard continue à fonctionner.

Créer un token : https://github.com/settings/personal-access-tokens/new

> Important : dans une application sans backend, le navigateur doit nécessairement avoir accès au token pendant la session. Évite les extensions de navigateur non fiables et ne stocke pas le token dans le code source.

## Mode public

Sans token, GitHome peut aussi fonctionner en mode public pour le compte `brahmiamine`. Les repositories privés et certaines informations nécessitant une authentification ne seront alors pas disponibles.

## Déploiement GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml` construit automatiquement l'application depuis `main`.

Dans GitHub :

1. Ouvrir **Settings → Pages**.
2. Sélectionner **GitHub Actions** comme source.
3. Relancer le workflow **Deploy GitHub Pages** si nécessaire.

L'URL attendue est :

`https://brahmiamine.github.io/gitHome/`

## Données affichées

Pour chaque repository, GitHome affiche notamment :

- visibilité Public / Private ;
- description, topics, langage principal et répartition des langages ;
- stars, forks, branche principale, taille, licence ;
- dernières Pull Requests avec statut Draft / Open / Closed / Merged ;
- GitHub Actions récentes, branche, événement et conclusion ;
- déploiements récents et `environment_url` lorsqu'elle existe ;
- GitHub Pages et homepage ;
- dernier commit ;
- dernière release ;
- nombre de branches ;
- environnements GitHub ;
- date du dernier push et date de création.

Les détails riches sont chargés progressivement au scroll afin d'éviter d'épuiser inutilement la limite de l'API GitHub.
