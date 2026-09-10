# Audit des manquements

## Disruption Navigator - Exercice C

**Date :** 2026-09-10  
**Nature :** analyse read-only de la couverture specification/code  
**Conclusion :** le MVP visuel fonctionne, mais l'implementation ne couvre pas encore integralement le blueprint ni tous les criteres du Menu C.

## 1. Point de cadrage important

Le **dark mode/light mode** apparait dans la page du **Menu A**, sous `If you're fast` : il s'agit d'une option du landing page, pas d'un critere minimum de l'exercice C.

Le **Menu C** comporte sa propre rubrique `If you're fast`, qui demande :

- scenario combine : fermeture de Suez et Panama simultanement ;
- suggestions de reroutage ;
- vue de comparaison avant/apres.

L'application couvre partiellement les deux premiers points, mais pas la comparaison avant/apres. Le dark/light mode peut etre ajoute comme amelioration transverse, mais il ne doit pas etre confondu avec une exigence obligatoire du Menu C.

## 2. Etat de couverture synthetique

| Domaine | Etat | Commentaire |
|---|---|---|
| Parcours zones → services | Partiel | Fonctionne en fixture ; recherche fixture simplifiee. |
| Detail service | Partiel | Fonctionne avec fixture enrichie, pas avec le contrat live complet. |
| Proforma + flotte en parallele | Non conforme | Le frontend appelle `/api/services/:code` seulement. |
| Timeline ports/transit | Couvert fixture | Donnees optionnelles live non normalisees. |
| Fermeture Suez/Panama | Couvert | Recalcul local fonctionnel. |
| Chokepoints additionnels | Partiel | Registre ajoute, mais evidence et fixtures restent limitees. |
| Carte 2D | Couvert | Leaflet affiche ports et route heuristique. |
| Globe 3D | Couvert | Onglet Three.js rotatif valide dans le navigateur. |
| Route alternative | Partiel | Visualisation heuristique, pas de moteur nautique. |
| Etats loading/empty | Partiel | Loading et empty présents ; retry/stale partiels ou absents. |
| Erreurs API | Partiel | Proxy basique ; mapping et observabilite incomplets. |
| Securite serveur | Insuffisant | CORS ouvert, pas de CSP/rate limit/redaction structuree. |
| Accessibilite | Partiel | Labels et roles presents ; annonces et clavier avancé incomplets. |
| Tests | Insuffisant | 9 tests domaine ; aucune suite UI/E2E/API. |
| Dark/light mode | Absent | Option Menu A, hors minimum Menu C. |
| Before/after | Absent | Option explicitement rattachee au Menu C. |
| Agent read-only | Absent | Exigence de Hands-On 02 optionnelle mais non implementee. |

## 3. Manquements critiques ou fonctionnels

### M-01 - Chargement du detail live incorrect

**Severite : critique**  
**Exigence :** C-10, C-24, R-04.  
**Constat :** `src/App.tsx`, `selectService()` appelle uniquement `GET /api/services/:code` et attend un `ServiceDetail` contenant `proformaCalls` et `fleet`. En mode live, `server/index.ts` retourne le schema amont `Service`, qui ne contient ni `proformaCalls` ni `fleet`. Les routes `/proformacalls` et `/fleet` existent mais ne sont jamais appelees par le frontend.

**Impact :** le critere “une vue detail fonctionne avec une donnee API” n'est pas garanti ; l'exigence d'appels paralleles n'est pas respectee.

**Correction :** appeler detail, proforma et fleet avec `Promise.allSettled`, normaliser trois reponses independantes, et rendre chaque section independamment.

### M-02 - Appels paralleles non implementes

**Severite : critique**  
**Exigence :** Menu C, Prompt 2.  
**Constat :** le frontend ne fait pas `Promise.all`/`Promise.allSettled`. Il depend d'une fixture serveur agregée.

**Correction :** introduire `loadServiceDetail(code)` dans un client API frontend, lancer les trois requetes en parallele, puis conserver les succes partiels.

### M-03 - Escalade critique incorrecte

**Severite : haute**  
**Exigence :** Hands-On 02, exemple Menu C ; R-13.  
**Constat :** `criticalEscalation = affected.length >= 3` dans `src/App.tsx`. Aucun niveau de criticite n'est modele. Trois services non critiques declencheraient l'escalade.

**Correction :** ajouter `criticality` dans `ServiceSummary` ou un registre de criticite fixture, puis compter uniquement les services affectes et critiques. Reutiliser/tester `addEscalation()` au lieu d'une condition UI locale.

### M-04 - Libelle de scenario incorrect pour les nouveaux chokepoints

**Severite : moyenne**  
**Constat :** la banniere utilise `item === 'SUEZ' ? 'Suez' : 'Panama'`. Malacca, Hormuz, Kiel, etc. sont donc affiches comme “Panama”.

**Correction :** utiliser `chokepointById[item].label` partout dans l'interface.

### M-05 - Vue avant/apres absente

**Severite : moyenne, option Menu C explicitement documentee**  
**Constat :** il existe une carte nominale/alternative et un accordéon impact, mais pas de mode de comparaison avec deux états clairement comparables.

**Correction :** ajouter un troisième mode ou un split view `Before / After`, avec route nominale à gauche et route alternative à droite, plus delta de jours et ports affectés.

## 4. Manquements API, erreurs et robustesse

### M-06 - Reponses 206 et Content-Range non preservees dans le frontend

Le backend live retransmet le payload brut, tandis que le frontend ne lit que `items`. Le statut HTTP 206, `Content-Range` et le flag partiel ne sont pas normalises ni affiches.

### M-07 - Retry absent

L'interface affiche une erreur et un bouton de fermeture, mais pas de bouton `Reessayer`. Le blueprint le demande pour les erreurs retryables et les sous-sections detail.

### M-08 - Requetes non annulables

Aucun `AbortController` ne protege les changements rapides de corridor/service. Une reponse ancienne peut remplacer un choix plus recent.

### M-09 - Etats stale et erreurs partielles incomplets

La specification demande de conserver la derniere liste valide comme stale lorsque possible. Le code vide `selected` et ne conserve pas une liste precedente signalee stale. Le detail fixture est agrege, ce qui masque les erreurs independantes proforma/fleet.

### M-10 - Contrat fixture/live divergent

Le mode fixture retourne une forme enrichie propre au frontend ; le mode live retourne des schemas OpenAPI differents. Il manque une couche de normalisation commune au serveur ou au client.

### M-11 - Recherche fixture trop permissive

`server/index.ts` retourne `AMERICAS` pour toute paire autre que `ASIE` → `WEUR`, au lieu de simuler une liste vide ou une erreur coherente selon la paire choisie.

## 5. Manquements sécurité et exploitation

### M-12 - CORS ouvert

`app.use(cors())` autorise toutes les origines. Le blueprint demande une origine frontend configuree.

### M-13 - CSP, rate limit et headers de sécurité absents

Aucun middleware ne met en place CSP, HSTS/headers de sécurité ou limitation de débit.

### M-14 - Logs structurés et redaction absents

Le proxy ne journalise pas systématiquement requestId, durée, endpoint et statut ; il ne possède pas de redaction structurée des headers secrets. Les erreurs amont sont directement exposées avec leur message.

### M-15 - Configuration runtime non validée

Les variables d'environnement sont lues directement dans `server/index.ts`; il n'existe pas de schéma de configuration qui refuse une combinaison live invalide ou `FIXTURE_MODE` en production.

## 6. Manquements interface et accessibilité

### M-16 - Dark/light mode absent

Le site est uniquement sombre. Ce point est une option du Menu A, pas une obligation minimum du Menu C. Si l'objectif est d'atteindre la liste complète des options du guide, il faut ajouter un theme switcher persistant et tester les deux themes.

### M-17 - A/B hero absent

Le Menu A optionnel demande deux variantes de promesse hero. L'application C n'a pas besoin de cette fonctionnalite ; ne pas la traiter comme exigence C.

### M-18 - FAQ repliable absente

Le Menu A optionnel mentionne une FAQ repliable. Hors perimetre C, à ignorer sauf demande transverse explicite.

### M-19 - Announcements et clavier incomplets

Les onglets ont `role=tab` et `aria-selected`, mais pas de navigation clavier arrow/home/end ni `aria-controls`. Les changements de resultat et d'erreur ne sont pas annonces dans une region `aria-live` dédiée.

### M-20 - Boutons fonctionnels manquants

Le bouton d'aide est visuel mais sans comportement. Le blueprint prévoit reset scenario et aide securite. Aucun reset global des toggles, liste, service et onglet n'est implementé.

### M-21 - Stack divergente

La specification initiale propose Tailwind. Le projet utilise exclusivement un fichier CSS monolithique. Ce n'est pas une non-conformite fonctionnelle, mais c'est une divergence technique à accepter ou documenter.

### M-22 - Bundle 3D volumineux

Le build signale un chunk d'environ 1.3 MB, au-dessus du seuil recommande Vite. Il faut envisager un chargement lazy de `GlobeViewer` et un chunk séparé.

## 7. Manquements tests et livraison

### M-23 - Absence de tests API/integration

Les 9 tests actuels couvrent principalement `assessImpact()` et `buildRouteModel()`. Aucun test ne vérifie les routes Express, les erreurs upstream, les contrats live, les secrets ou le parallélisme.

### M-24 - Absence de tests UI/E2E automatises

Le parcours a été vérifié manuellement, mais il n'existe pas de test Playwright/Cypress pour AT-C-01 à AT-C-15.

### M-25 - Absence de test d'absence de secret dans le bundle

La clé n'est pas dans les sources actuelles, mais aucune vérification automatisée ne scanne le bundle produit.

### M-26 - Agent Hands-On 02 non livré

Les garde-fous et le contrat sont documentés, mais il n'existe pas d'agent, de prompt, de tool read-only ou de test de refus. Ce point est optionnel pour le MVP du Menu C, mais requis pour compléter la suite Hands-On 02.

## 8. Plan de rattrapage priorisé

### Phase P0 - Corriger le contrat fonctionnel réel

1. Implémenter `loadServiceDetail()` avec trois appels parallèles et `Promise.allSettled`.
2. Normaliser les réponses fixture/live en un contrat commun.
3. Isoler les erreurs proforma et fleet.
4. Corriger les libellés dynamiques des chokepoints.
5. Remplacer le comptage simpliste de criticité par un registre explicite.
6. Ajouter retry, abort controller et conservation stale.

**Critère de sortie :** un service live ou fixture peut afficher indépendamment detail, timeline et flotte, avec un échec d'une sous-requête sans casser les deux autres.

### Phase P1 - Compléter le parcours Menu C

1. Ajouter la vue `Before / After`.
2. Ajouter un reset scenario.
3. Ajouter une vraie aide expliquant simulation, heuristique et validation humaine.
4. Ajouter les fixtures d'erreur 400/404/416/500/timeout et leurs tests.
5. Ajouter tests API du proxy et tests de parallélisme.

**Critère de sortie :** tous les critères minimum et les options Menu C sélectionnées sont démontrables sans manipulation manuelle du code.

### Phase P2 - Sécurité et exploitation

1. Configurer CORS par variable d'environnement.
2. Ajouter CSP et headers sécurité.
3. Ajouter rate limit.
4. Valider la configuration au démarrage.
5. Ajouter logs structurés avec requestId, statut, durée et redaction.
6. Ajouter scan automatique du bundle contre les secrets.

**Critère de sortie :** le proxy live est exploitable sans exposition de secret et ses erreurs sont traçables.

### Phase P3 - Qualité UI

1. Ajouter `aria-live`, gestion clavier complète des tabs et focus visible.
2. Ajouter lazy loading du globe.
3. Tester mobile, desktop, carte, globe et comparaison.
4. Corriger le texte de l'interface pour le français ou choisir officiellement l'anglais.

**Critère de sortie :** parcours accessible, responsive et performant.

### Phase P4 - Options transverses et Hands-On 02

1. Ajouter dark/light mode si l'objectif inclut les options du Menu A.
2. Ajouter stockage local du thème et respect de `prefers-color-scheme`.
3. Ajouter A/B hero et FAQ uniquement si le périmètre A est également demandé.
4. Implémenter l'agent read-only, ses garde-fous et son test de refus si Hands-On 02 doit être livré.

**Critère de sortie :** les options hors Menu C sont explicitement couvertes ou marquées hors périmètre.

## 9. Ordre recommande des tickets

1. `GAP-01` Contrat detail et appels parallèles.
2. `GAP-02` Normalisation fixture/live et pagination.
3. `GAP-03` Retry, stale, abort et erreurs partielles.
4. `GAP-04` Criticité et escalade.
5. `GAP-05` Labels dynamiques chokepoints.
6. `GAP-06` Comparaison before/after.
7. `GAP-07` Tests API et E2E.
8. `GAP-08` Sécurité proxy et validation configuration.
9. `GAP-09` Accessibilité et reset/aide.
10. `GAP-10` Lazy loading globe.
11. `GAP-11` Dark/light mode transverse.
12. `GAP-12` Agent Hands-On 02.

## 10. Definition of Done de l'audit

- [ ] Chaque manquement critique possède un ticket et un test.
- [ ] Le live API utilise les endpoints proforma et fleet réellement.
- [ ] Les erreurs partielles sont visibles section par section.
- [ ] Le scenario combine possède une comparaison avant/apres.
- [ ] La criticite est explicite et l'escalade est correcte.
- [ ] Les nouveaux chokepoints utilisent leurs vrais libelles.
- [ ] Retry, abort, stale et 206 sont testes.
- [ ] CORS, CSP, rate limit, logs et config sont durcis.
- [ ] UI/E2E couvrent le parcours principal.
- [ ] Le dark/light mode est soit livré, soit marqué explicitement comme option Menu A hors perimetre C.
- [ ] La matrice de traçabilite est mise à jour après correction.
