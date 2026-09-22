# Manuscrit2GCode

Application **100 % frontend**, sans build ni dépendance, qui transforme un texte en G-code
d'écriture manuscrite pour plotter à stylo — pensée pour une **Elegoo Neptune 4 Plus sous Klipper**
équipée d'un porte-stylo, mais adaptable à n'importe quel plotter via le profil machine.

## Installation

1. Téléchargez / copiez le dossier complet (`index.html`, `css/`, `js/`, `fonts/`, `assets/`).
2. Double-cliquez sur `index.html`.
3. C'est tout — aucun serveur, aucune installation, aucune connexion internet requise.

L'application fonctionne directement depuis une URL `file:///...`, y compris sur Chrome, Edge et
Firefox. Aucun appel réseau, aucun CDN, aucune dépendance externe : tout le code (moteur
d'écriture, police, interface) est embarqué dans le dossier.

Pour lancer la suite de tests intégrée : ouvrez `tests.html` de la même façon.

## Utilisation

1. Saisissez votre texte dans le panneau **Texte**.
2. Choisissez un niveau d'humanisation (**Naturel** par défaut) et une personnalité d'écriture.
3. Cliquez sur **Nouvelle variation** jusqu'à obtenir un rendu qui vous plaît (la seed affichée
   permet de reproduire exactement la même écriture plus tard).
4. Vérifiez le rendu dans l'aperçu SVG (modes *Résultat* / *Trajectoires* / *Mouvements* / *Debug*),
   puis lancez la **simulation** (▶) pour voir le stylo « écrire » à l'écran.
5. Ajustez si besoin le papier, les marges, la machine et le stylo dans le panneau latéral.
6. Téléchargez le fichier `.gcode` (bouton **Télécharger G-code**) et/ou le `.svg` du résultat final.

Tous les réglages (machine, papier, humanisation, dernière seed...) sont sauvegardés automatiquement
dans `localStorage` et restaurés à la prochaine ouverture. Le bouton **Réinitialiser les paramètres**
efface cette sauvegarde et revient aux valeurs par défaut.

## Sécurité machine — à lire avant d'imprimer

- **Ne jamais faire de homing Z (`G28 Z`) avec le porte-stylo installé** si le stylo dépasse sous la
  buse : collision quasi certaine avec le plateau. Le G-code généré par défaut ne contient **jamais**
  de `G28`, quel qu'il soit — c'est à vous d'homer la machine (Z compris) **avant** de monter le
  porte-stylo, ou en utilisant une procédure de homing adaptée à votre montage.
- Aucune commande d'extrusion (`E`) ni de température (`M104` / `M109`) n'est jamais générée par
  défaut : c'est un plotter à stylo, pas une impression 3D.
- Le G-code de début par défaut se limite à `G90` (positionnement absolu) et `G21` (unités en mm).
  Vous pouvez le personnaliser (panneau *Machine & stylo → G-code de début/fin*), mais tout ajout est
  scanné et signalé s'il contient un motif dangereux (`G28 Z`, `M104`, `M109`, extrusion).
- Avant tout export, l'application vérifie que **toutes** les coordonnées (X, Y, Z) du tracé restent
  dans les limites du profil machine. En cas de dépassement, un avertissement explicite s'affiche
  (avec les valeurs en cause) et le téléchargement du G-code demande une confirmation.

## Calibration du Z / pression du stylo

Le porte-stylo est supposé **monté sur ressort** (la pression variable est simulée en abaissant très
légèrement le Z, jamais en extrudant de la matière) :

1. Montez le porte-stylo, stylo en place, ressort au repos.
2. Réglez manuellement (jog Z) la hauteur à laquelle la pointe touche le papier tout juste :
   c'est votre `Z stylo posé` (**Pen Down Z**).
3. Remontez de quelques millimètres (assez pour dégager le papier pendant les déplacements) :
   c'est votre `Z stylo levé` (**Pen Up Z**).
4. Le champ `Z minimum (sécurité)` (**minPenZ**) doit rester *au-dessus* de la butée mécanique basse
   du ressort — c'est un plancher dur : quelle que soit l'humanisation demandée (variation de
   pression comprise), aucune commande générée ne descendra en dessous de cette valeur.
5. La case **« Variation de pression Z »** peut être décochée à tout moment pour désactiver
   complètement cette variation (Z constant = `Pen Down Z` pendant tout le tracé).

## Fixation du papier

- Le panneau *Machine & stylo* affiche la position (`Feuille X` / `Feuille Y`) et la rotation de la
  feuille sur le plateau : elles doivent correspondre à l'endroit où vous avez physiquement scotché
  le papier.
- L'aperçu superpose plateau machine, feuille et marges pour vérifier visuellement que tout le texte
  tient dans la zone accessible — y compris quand la feuille est plus grande que le plateau utile.
- Un support d'adhésif ou de pinces aux 4 coins est recommandé : le stylo exerce une pression latérale
  pendant l'écriture qui peut faire glisser une feuille mal fixée.

## Architecture

```
index.html            point d'entrée unique
tests.html             suite de tests maison (aucune dépendance)
css/                   reset + styles de l'application
js/core/                SeededRandom, bruit corrélé, géométrie, échantillonnage de courbes
js/fonts/               format de police mono-trait + moteur + sélecteur de glyphes
js/handwriting/         layout, humanisation hiérarchique, traitement des traits, optimisation
js/plotter/              opérations plotter (PEN_UP/MOVE/PEN_DOWN/DRAW), profil machine, G-code
js/preview/              rendu SVG + simulateur (mêmes opérations que le G-code)
js/ui/                   presets, sauvegarde localStorage, liaison DOM
js/app.js               orchestrateur (le seul fichier qui pilote le pipeline complet)
js/tests/                runner + cas de test
fonts/handwriting-default/font.js   police de démo mono-trait (A-Z, a-z, 0-9, accents, ponctuation)
tools/validate-font.js  script Node optionnel (hors application) pour valider un fichier font.js
```

Pipeline (chaque étage ne connaît que le format produit par le précédent — voir les commentaires en
tête de chaque fichier) :

```
texte → layout → sélection des glyphes → humanisation hiérarchique
      → traitement des traits (courbes, jitter, Z, vitesse)
      → optimisation → transformation repère machine
      → opérations plotter → G-code (et aperçu SVG / simulation, à partir des mêmes opérations)
```

## Ajouter une police / des glyphes

Une police est un simple fichier `.js` qui s'auto-enregistre dans `window.HandwriterFonts` (aucun
`fetch`, donc compatible `file://`). Voir `fonts/handwriting-default/font.js` pour le format complet
et `js/fonts/font-authoring-kit.js` pour les utilitaires de construction (lignes, courbes, arcs
elliptiques). Le script `tools/validate-font.js` (nécessite Node, uniquement pour le développement,
jamais chargé par l'application) permet de vérifier hors-ligne qu'un fichier de police ne contient
pas de coordonnées aberrantes avant de l'essayer dans le navigateur :

```
node tools/validate-font.js fonts/ma-police/font.js
```

## Limitations connues (MVP)

- Une seule police est fournie par défaut (`handwriting-default`), avec une couverture complète
  (A-Z, a-z, 0-9, accents français, ponctuation courante) mais un nombre de variantes par lettre
  volontairement limité (3 à 4 pour les lettres les plus fréquentes, 1 à 2 ailleurs) — l'architecture
  est prête pour en accueillir davantage, y compris une police dérivée d'une vraie écriture manuscrite.
- L'import de SVG mono-trait externe n'est pas encore implémenté (prévu par l'architecture, non
  câblé dans l'interface).
- La régénération complète du document est débouncée mais reste synchrone dans le thread principal ;
  sur un très long document (plusieurs pages), un léger délai est normal. Un Web Worker pourrait être
  introduit plus tard sans changer le format des modules.
- Le zoom/ajustement de l'aperçu est volontairement simple (viewBox SVG) ; pas de pan à la souris.
