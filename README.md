# Disruption Navigator

Application read-only de simulation d'impact maritime pour l'exercice C.

## Lancer en mode demonstration

```powershell
npm install
$env:FIXTURE_MODE="true"
npm run dev
```

Ouvrir ensuite http://localhost:5173.

Le mode fixture permet de rejouer le parcours complet sans cle API : `ASIE` vers `WEUR`, selection de FAL, detail des escales/flotte, affichage de la carte mondiale, puis fermeture de Suez. La carte utilise Leaflet et OpenStreetMap, sans token cartographique obligatoire.

## Carte et chokepoints

La zone de route propose trois onglets :

- **2D map** : carte Leaflet actuelle avec ports, chokepoints et route alternative ;
- **3D globe** : globe terrestre Three.js manipulable à la souris, avec rotation automatique, rotation manuelle par glisser-déposer et zoom à la molette.
- **Before / After** : comparaison côte à côte de la route nominale et de l'alternative proposée.

Les deux vues affichent les ports connus par leur UN/LOCODE, la route nominale, les chokepoints actifs et une route alternative en pointilles lorsqu'une fermeture impacte le service. La timeline reste la source de verite lorsque des coordonnees sont inconnues.

Les géométries sont calculées côté serveur sur un graphe de routes maritimes, et non par des segments directs entre ports. Elles évitent ainsi les traversées manifestes de continents et les détours polaires produits par une simple interpolation cartographique.

Ce calcul reste indicatif et ne constitue pas une route de navigation certifiée. Une validation opérationnelle doit intégrer le tirant d'eau et les caractéristiques du navire, la marge sous quille (UKC), les ENC S-101/S-57, la bathymétrie S-102 ou équivalente, les niveaux d'eau, les restrictions portuaires, la météo et les avertissements de navigation. Pour un usage production, remplacer le moteur local par un fournisseur maritime qualifié et conserver l'API derrière le proxy serveur.

Le registre actuel couvre :

- canaux de Suez, Panama et Kiel ;
- detroits de Malacca, Bab el-Mandeb, Hormuz, Bosphore/Dardanelles et detroits danois.

Les quatre premiers scenarios (Suez, Panama, Malacca, Bab el-Mandeb) sont prioritaires pour le prototype. Hormuz, Bosphore/Dardanelles, Danish Straits et Kiel sont des candidats regionaux a valider avec les operations avant un usage production. Les fermetures, routes alternatives et jours supplementaires sont des heuristiques de demonstration : elles ne constituent ni un suivi de navire ni un routage nautique certifie.

## Mode API CMA CGM

Ne mettez jamais la cle dans le frontend, dans Git ou dans un prompt. Configurez-la uniquement dans l'environnement du serveur, après rotation de toute cle exposee :

```powershell
$env:FIXTURE_MODE="false"
$env:CMA_API_BASE_URL="https://apis.cma-cgm.net/vesseloperation/proforma/v2"
$env:CMA_API_KEY="<secret fourni par le gestionnaire de l'API>"
$env:ALLOWED_ORIGINS="http://localhost:5173"
npm run dev
```

Le proxy Express ajoute le header `KeyId`, limite les appels aux GET necessaires et garde le secret hors du navigateur. Il valide la configuration live au démarrage, restreint CORS, limite le débit, ajoute des en-têtes de sécurité et produit des logs JSON corrélés par `requestId`. Sans clé live, l'application doit rester en mode fixture.

Le détail charge en parallèle les métadonnées, les escales proforma et la flotte. Une sous-requête en échec reste isolée et peut être relancée sans masquer les autres données. Les requêtes obsolètes sont annulées lors d'un changement rapide de sélection.

Le thème clair/sombre est mémorisé dans le navigateur et adopte la préférence système lors de la première visite.

## Agent d'impact financier

Lorsqu'un service est affecté, le panneau de détail estime le coût du reroutage avec une ventilation entre coût direct et coût d'opportunité. Le moteur TypeScript calcule les montants de manière déterministe; Mistral génère uniquement l'explication et la recommandation à partir de ces montants.

Le modèle de démonstration `rerouting-cost-v2` utilise les hypothèses suivantes :

- 65 000 EUR par navire et par jour d'exploitation supplémentaire ;
- 55 000 EUR par navire et par jour de carburant supplémentaire ;
- 45 000 EUR par jour de retard commercial pour un service critique, 20 000 EUR sinon ;
- 150 000 EUR de frais de route par navire lorsqu'un reroutage est nécessaire ;
- intervalle d'incertitude de -20 % à +25 % autour de l'estimation centrale.

Ces valeurs sont configurées pour la démonstration et doivent être remplacées par des données finance, bunker, affrètement et contrats clients validées avant tout usage opérationnel.

La clé Mistral reste exclusivement dans l'environnement du serveur. Copier `.env.example` vers `.env`, puis renseigner la nouvelle clé dans `.env` uniquement :

```powershell
Copy-Item .env.example .env
# Modifier MISTRAL_API_KEY dans .env sans partager sa valeur.
npm run dev
```

Le script serveur charge automatiquement ce fichier, qui est ignoré par Git. Sans clé, en cas de timeout ou de réponse Mistral invalide, le calcul et une synthèse locale restent disponibles. Le navigateur ne reçoit jamais la clé.

## Verifications

```powershell
npm test
npm run build
npm run test:secrets
```

Le moteur de disruption est local et explicable. Les routes alternatives et les jours additionnels sont des estimations heuristiques et chaque recommandation est marquee `[PROPOSAL]`; aucune action de reroutage n'est executee.