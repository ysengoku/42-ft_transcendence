# 🧪 Guide Complet des Tests - Projet Transcendence

Ce guide explique comment utiliser et comprendre les tests unitaires dans le projet Transcendence, de A à Z, même si vous n'avez jamais fait de tests auparavant.

## 📚 Table des matières

1. [Qu'est-ce que les tests unitaires ?](#quest-ce-que-les-tests-unitaires-)
2. [Démarrage de l'environnement](#démarrage-de-lenvironnement)
3. [Structure des tests](#structure-des-tests)
4. [Lancer les tests](#lancer-les-tests)
5. [Comprendre les options](#comprendre-les-options)
6. [Comprendre les assertions](#comprendre-les-assertions)
7. [Cycle de vie d'un test](#cycle-de-vie-dun-test)
8. [Interpréter les résultats](#interpréter-les-résultats)
9. [Déboguer les tests](#déboguer-les-tests)
10. [Bonnes pratiques](#bonnes-pratiques)

---

## 🤔 Qu'est-ce que les tests unitaires ?

Les **tests unitaires** sont des petits programmes qui vérifient automatiquement que votre code fonctionne comme prévu. Imaginez que vous testez une calculatrice :

```python
def test_addition():
    result = calculer(2 + 3)
    assert result == 5  # Vérifie que 2+3 donne bien 5
```

Dans notre projet Transcendence, nous testons les **endpoints API** (les URLs que le frontend appelle) pour vérifier qu'ils :
- Retournent les bonnes données
- Gèrent correctement les erreurs
- Respectent les permissions
- Fonctionnent dans tous les scénarios

---

## 🐳 Démarrage de l'environnement

### 1. Démarrer Docker

Avant de lancer les tests, vous devez démarrer l'environnement Docker :

```bash
# Aller dans le dossier du projet
cd /chemin/vers/projet

# Démarrer tous les services Docker
make up
```

**Que se passe-t-il ?** Cette commande lance :
- 🗄️ Une base de données PostgreSQL
- 🐍 Le serveur Django (backend)
- 🌐 Le serveur frontend (Vite)
- 🔧 Nginx (proxy)
- ⏰ Un service de tâches planifiées

### 2. Vérifier que tout fonctionne

```bash
# Vérifier que les conteneurs sont lancés
docker ps

# Vous devriez voir 5 conteneurs en cours d'exécution
```

### 3. Lancer les tests avec statistiques (Recommandé)

```bash
# Script avec statistiques détaillées (nouveau !)
./test_with_stats.sh

# Pour un module spécifique
./test_with_stats.sh users
./test_with_stats.sh chat
./test_with_stats.sh pong
./test_with_stats.sh tournaments
```

### 4. Méthode alternative : Entrer dans le conteneur

```bash
# Méthode 1 : Avec Make (recommandé)
make bash-backend

# Méthode 2 : Directement avec Docker
docker exec -it server bash
```

**Vous êtes maintenant dans le conteneur Django** où vous pouvez lancer les tests !

---

## 📁 Structure des tests

### Organisation des fichiers

```
server/
├── users/tests/
│   ├── test_auth_endpoints.py      # Tests d'authentification
│   ├── test_mfa_endpoints.py       # Tests MFA (2FA)
│   ├── test_oauth2_endpoints.py    # Tests OAuth (GitHub, 42)
│   └── test_users_endpoints.py     # Tests gestion utilisateurs
├── chat/tests/
│   ├── test_chat_endpoints.py      # Tests chat et messages
│   └── test_notifications_endpoints.py # Tests notifications
├── pong/tests/
│   └── test_game_stats_endpoints.py # Tests statistiques de jeu
└── tournaments/tests/
    └── test_tournaments_endpoints.py # Tests tournois
```

### Anatomie d'un fichier de test

```python
import logging
from django.test import TestCase
from users.models import User

class AuthEndpointsTests(TestCase):  # Classe de tests
    
    def setUp(self):  # Préparation avant chaque test
        """Exécuté AVANT chaque test individuel"""
        logging.disable(logging.CRITICAL)  # Désactive les logs
        # Créer des données de test
        self.user = User.objects.create_user(
            "TestUser", 
            email="test@example.com", 
            password="TestPassword123"
        )
    
    def tearDown(self):  # Nettoyage après chaque test
        """Exécuté APRÈS chaque test individuel"""
        logging.disable(logging.NOTSET)  # Réactive les logs
        # Django supprime automatiquement les données de test
    
    def test_login_with_correct_credentials(self):  # Un test
        """Test que la connexion fonctionne avec de bons identifiants"""
        # Arrange : Préparer les données
        data = {"username": "TestUser", "password": "TestPassword123"}
        
        # Act : Exécuter l'action à tester
        response = self.client.post("/api/login", 
                                  content_type="application/json", 
                                  data=data)
        
        # Assert : Vérifier le résultat
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["username"], "TestUser")
```

---

## 🚀 Lancer les tests

### 🎯 Méthode recommandée : Avec statistiques

```bash
# Depuis la racine du projet (plus simple et avec stats !)
# IMPORTANT : Docker doit être lancé avec 'make up' d'abord

# 1. Lancer TOUS les tests avec statistiques
make tests
# ou
./test_with_stats.sh

# 2. Lancer tests par module avec statistiques  
make tests-users      # Tests utilisateurs & auth
make tests-chat       # Tests chat & notifications
make tests-pong       # Tests jeu & statistiques
make tests-tournaments # Tests tournois

# Ou directement avec le script :
./test_with_stats.sh users
./test_with_stats.sh chat
./test_with_stats.sh pong
./test_with_stats.sh tournaments
```

**Exemple de sortie :**
```
🧪 Running Django Tests with Statistics
========================================
🎯 Running tests for: users
[sortie normale des tests...]

📊 SUMMARY
==========
Total tests: 70
✅ Passed: 49 (70%)
❌ Failed: 14 (20%) 
💥 Errors: 7 (10%)
🎯 Success rate: 70%
🟡 Status: GOOD
```

### 🔧 Méthode alternative : Commandes manuelles

```bash
# IMPORTANT : Vous devez être dans le conteneur backend
# (utilisez `make bash-backend` depuis la racine du projet)

# 1. Lancer TOUS les tests du projet
python manage.py test

# 2. Lancer tous les tests d'une app
python manage.py test users
python manage.py test chat
python manage.py test pong
python manage.py test tournaments

# 3. Lancer un fichier de test spécifique
python manage.py test users.tests.test_auth_endpoints

# 4. Lancer une classe de tests spécifique
python manage.py test users.tests.test_auth_endpoints.AuthEndpointsTests

# 5. Lancer un test individuel
python manage.py test users.tests.test_auth_endpoints.AuthEndpointsTests.test_login_with_correct_credentials
```

### Lancer uniquement les nouveaux tests créés

```bash
# Tous les nouveaux tests endpoints en une commande
python manage.py test \
  users.tests.test_auth_endpoints \
  users.tests.test_mfa_endpoints \
  users.tests.test_oauth2_endpoints \
  chat.tests.test_chat_endpoints \
  chat.tests.test_notifications_endpoints \
  pong.tests.test_game_stats_endpoints \
  tournaments.tests.test_tournaments_endpoints
```

### Tests par thématique

```bash
# Tests d'authentification uniquement
python manage.py test \
  users.tests.test_auth_endpoints \
  users.tests.test_mfa_endpoints \
  users.tests.test_oauth2_endpoints

# Tests de communication (chat + notifications)
python manage.py test \
  chat.tests.test_chat_endpoints \
  chat.tests.test_notifications_endpoints

# Tests de jeu
python manage.py test \
  pong.tests.test_game_stats_endpoints \
  tournaments.tests.test_tournaments_endpoints
```

---

## ⚙️ Comprendre les options

### L'option `--verbosity` (niveau de détail)

```bash
# --verbosity=0 : Silencieux (seulement les erreurs)
python manage.py test users.tests.test_auth_endpoints --verbosity=0

# --verbosity=1 : Basique (par défaut)
python manage.py test users.tests.test_auth_endpoints --verbosity=1

# --verbosity=2 : Détaillé (recommandé pour déboguer)
python manage.py test users.tests.test_auth_endpoints --verbosity=2

# --verbosity=3 : Très détaillé (toutes les informations)
python manage.py test users.tests.test_auth_endpoints --verbosity=3
```

**Exemple de sortie avec verbosity=2 :**
```
Creating test database for alias 'default' ('test_your_database_name')...
Operations to perform:
  Synchronize unmigrated apps: channels, daphne, messages, staticfiles
  Apply all migrations: admin, auth, chat, contenttypes, pong, sessions, silk, sites, tournaments, users
System check identified no issues (0 silenced).
test_login_with_bad_data (users.tests.test_auth_endpoints.AuthEndpointsTests) ... ok
test_login_with_correct_credentials (users.tests.test_auth_endpoints.AuthEndpointsTests) ... ok
test_login_with_empty_data (users.tests.test_auth_endpoints.AuthEndpointsTests) ... ok

----------------------------------------------------------------------
Ran 3 tests in 2.451s

OK
Destroying test database for alias 'default' ('test_your_database_name')...
```

### Autres options utiles

```bash
# --keepdb : Garde la base de test (plus rapide pour les tests répétés)
python manage.py test users.tests.test_auth_endpoints --keepdb

# --reverse : Lance les tests dans l'ordre inverse
python manage.py test users.tests.test_auth_endpoints --reverse

# --debug-mode : Mode debug (affiche plus d'infos en cas d'erreur)
python manage.py test users.tests.test_auth_endpoints --debug-mode

# --failfast : Arrête au premier test qui échoue
python manage.py test users.tests.test_auth_endpoints --failfast

# --dry-run : Montre quels tests seraient lancés sans les exécuter
python manage.py test users.tests.test_auth_endpoints --dry-run
```

---

## 🔍 Comprendre les assertions

Les **assertions** sont des vérifications que nous faisons dans les tests. Si une assertion échoue, le test échoue.

### Assertions de base

```python
# 1. Égalité
self.assertEqual(a, b)          # Vérifie que a == b
self.assertNotEqual(a, b)       # Vérifie que a != b

# Exemples concrets
self.assertEqual(response.status_code, 200)  # Le serveur a répondu avec succès
self.assertEqual(user.username, "TestUser")  # Le nom d'utilisateur est correct

# 2. Vérité/Fausseté
self.assertTrue(condition)      # Vérifie que condition est True
self.assertFalse(condition)     # Vérifie que condition est False

# Exemples
self.assertTrue(user.is_active)     # L'utilisateur est actif
self.assertFalse(user.is_staff)     # L'utilisateur n'est pas admin

# 3. Présence/Absence
self.assertIsNone(value)        # Vérifie que value est None
self.assertIsNotNone(value)     # Vérifie que value n'est pas None

# Exemples
self.assertIsNone(user.last_login)       # Première connexion
self.assertIsNotNone(response.json())    # La réponse contient du JSON

# 4. Collections
self.assertIn(item, collection)     # Vérifie que item est dans collection
self.assertNotIn(item, collection)  # Vérifie que item n'est pas dans collection

# Exemples
self.assertIn("username", response.json())           # Le JSON contient "username"
self.assertIn("access_token", response.cookies)      # Les cookies contiennent le token
```

### Assertions spécifiques au web

```python
# 1. Code de statut HTTP
self.assertEqual(response.status_code, 200)  # Succès
self.assertEqual(response.status_code, 401)  # Non autorisé
self.assertEqual(response.status_code, 404)  # Non trouvé
self.assertEqual(response.status_code, 422)  # Données invalides

# 2. Contenu de la réponse
self.assertContains(response, "text", status_code=200)
# Vérifie que la réponse contient "text" ET que le code est 200

# Exemples
self.assertContains(response, "Username or password are not correct", status_code=401)
self.assertContains(response, "Account successfully deleted", status_code=200)

# 3. JSON
response_data = response.json()
self.assertEqual(response_data["username"], "TestUser")
self.assertIn("access_token", response.cookies)
```

### Comparaisons avec messages personnalisés

```python
# Ajouter un message explicatif si l'assertion échoue
self.assertEqual(
    response.status_code, 
    200, 
    "La connexion devrait réussir avec de bons identifiants"
)

self.assertEqual(
    response.json()["username"], 
    "TestUser", 
    "Le nom d'utilisateur dans la réponse devrait être 'TestUser'"
)
```

---

## 🔄 Cycle de vie d'un test

### Ordre d'exécution

```python
class MonTestCase(TestCase):
    
    @classmethod
    def setUpClass(cls):
        """1. Exécuté UNE FOIS au début de la classe"""
        super().setUpClass()
        # Configuration globale pour tous les tests
        print("🏗️  Configuration de la classe")
    
    def setUp(self):
        """2. Exécuté AVANT CHAQUE test individuel"""
        print("🔧 Préparation du test")
        # Créer des données de test
        self.user = User.objects.create_user("test", "test@test.com", "pass123")
    
    def test_quelque_chose(self):
        """3. Le test lui-même"""
        print("🧪 Exécution du test")
        # Votre test ici
        response = self.client.post("/api/login", data={...})
        self.assertEqual(response.status_code, 200)
    
    def tearDown(self):
        """4. Exécuté APRÈS CHAQUE test individuel"""
        print("🧹 Nettoyage du test")
        # Django nettoie automatiquement la base de données
        # Vous pouvez ajouter du nettoyage personnalisé ici
    
    @classmethod
    def tearDownClass(cls):
        """5. Exécuté UNE FOIS à la fin de la classe"""
        super().tearDownClass()
        print("🏁 Nettoyage de la classe")
```

### Exemple avec plusieurs tests

```python
class AuthTests(TestCase):
    
    def setUp(self):
        print("🔧 Création de l'utilisateur de test")
        self.user = User.objects.create_user("test", "test@test.com", "pass123")
    
    def test_login_success(self):
        print("🧪 Test de connexion réussie")
        # Ce test utilise self.user créé dans setUp()
        
    def test_login_failure(self):
        print("🧪 Test de connexion échouée") 
        # Ce test utilise AUSSI self.user (nouveau setUp() appelé)
    
    def tearDown(self):
        print("🧹 Nettoyage après le test")
        # self.user est automatiquement supprimé par Django
```

**Ordre d'exécution :**
```
🏗️  Configuration de la classe
🔧 Préparation du test
🧪 Test de connexion réussie
🧹 Nettoyage après le test
🔧 Préparation du test  (nouveau setUp pour le 2e test)
🧪 Test de connexion échouée
🧹 Nettoyage après le test
🏁 Nettoyage de la classe
```

### Pourquoi setUp/tearDown ?

```python
# ❌ MAUVAIS : Tests dépendants les uns des autres
class MauvaisTests(TestCase):
    def test_create_user(self):
        user = User.objects.create_user("test", "test@test.com", "pass123")
        # Le user reste en base
    
    def test_login_user(self):
        # Ce test DÉPEND du test précédent !
        # Si test_create_user échoue, celui-ci échoue aussi
        response = self.client.post("/api/login", ...)

# ✅ BON : Tests indépendants
class BonsTests(TestCase):
    def setUp(self):
        # Chaque test a ses propres données fraîches
        self.user = User.objects.create_user("test", "test@test.com", "pass123")
    
    def test_create_user(self):
        # Test indépendant avec self.user
        
    def test_login_user(self):
        # Test indépendant avec self.user (différent du test précédent)
```

---

## 📊 Interpréter les résultats

### Test qui réussit

```bash
test_login_with_correct_credentials (users.tests.test_auth_endpoints.AuthEndpointsTests) ... ok

----------------------------------------------------------------------
Ran 1 test in 0.834s

OK
```

**Signification :**
- ✅ `ok` : Le test a réussi
- ⏱️ `0.834s` : Le test a pris 0.834 secondes
- 🎉 `OK` : Tous les tests ont réussi

### Test qui échoue

```bash
test_verify_mfa_with_invalid_user (users.tests.test_mfa_endpoints.MfaEndpointsTests) ... FAIL

======================================================================
FAIL: test_verify_mfa_with_invalid_user (users.tests.test_mfa_endpoints.MfaEndpointsTests)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/app/users/tests/test_mfa_endpoints.py", line 58, in test_verify_mfa_with_invalid_user
    self.assertEqual(response.status_code, 404)
AssertionError: 422 != 404

----------------------------------------------------------------------
Ran 1 test in 0.414s

FAILED (failures=1)
```

**Signification :**
- ❌ `FAIL` : Le test a échoué
- 📍 `line 58` : L'erreur est à la ligne 58
- 🔍 `AssertionError: 422 != 404` : On attendait 404, on a reçu 422
- 📈 `failures=1` : 1 test a échoué

### Test avec erreur

```bash
test_something (app.tests.TestCase) ... ERROR

======================================================================
ERROR: test_something (app.tests.TestCase)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/app/app/tests.py", line 10, in test_something
    result = undefined_function()
NameError: name 'undefined_function' is not defined
```

**Différence entre FAIL et ERROR :**
- 🔴 **FAIL** : Une assertion a échoué (comportement inattendu)
- 💥 **ERROR** : Le code a planté (bug dans le test)

### Tests ignorés

```bash
test_something (app.tests.TestCase) ... skipped 'Reason for skipping'
```

**Utilisé avec :**
```python
from unittest import skip

@skip("Cette fonctionnalité n'est pas encore implémentée")
def test_future_feature(self):
    pass
```

---

## 🐛 Déboguer les tests

### 1. Lancer un seul test pour isoler le problème

```bash
# Au lieu de lancer tous les tests
python manage.py test users.tests.test_auth_endpoints

# Lancer juste le test qui pose problème
python manage.py test users.tests.test_auth_endpoints.AuthEndpointsTests.test_login_with_correct_credentials --verbosity=2
```

### 2. Ajouter des prints de debug

```python
def test_login_with_correct_credentials(self):
    data = {"username": "TestUser", "password": "TestPassword123"}
    
    print(f"🔍 Données envoyées : {data}")  # Debug
    
    response = self.client.post("/api/login", 
                              content_type="application/json", 
                              data=data)
    
    print(f"🔍 Code de réponse : {response.status_code}")  # Debug
    print(f"🔍 Contenu de la réponse : {response.content}")  # Debug
    
    self.assertEqual(response.status_code, 200)
```

### 3. Utiliser le debugger Python

```python
def test_login_with_correct_credentials(self):
    data = {"username": "TestUser", "password": "TestPassword123"}
    
    import pdb; pdb.set_trace()  # Point d'arrêt
    
    response = self.client.post("/api/login", 
                              content_type="application/json", 
                              data=data)
    
    self.assertEqual(response.status_code, 200)
```

### 4. Examiner la base de données de test

```python
def test_something(self):
    # Voir tous les utilisateurs créés
    users = User.objects.all()
    print(f"🔍 Utilisateurs en base : {[u.username for u in users]}")
    
    # Vérifier qu'un utilisateur existe
    user_exists = User.objects.filter(username="TestUser").exists()
    print(f"🔍 TestUser existe : {user_exists}")
```

### 5. Problèmes courants et solutions

#### Problème : "AssertionError: 422 != 404"

```python
# Le code attend une erreur 404 mais reçoit 422
self.assertEqual(response.status_code, 404)  # ❌ Attendu
# Mais le serveur renvoie 422 (données invalides)

# Solution : Vérifier ce que renvoie vraiment l'endpoint
print(f"Code reçu : {response.status_code}")
print(f"Message : {response.content}")
# Puis ajuster le test
self.assertEqual(response.status_code, 422)  # ✅ Corrigé
```

#### Problème : "KeyError: 'username'"

```python
# Le test essaie d'accéder à une clé qui n'existe pas
response_data = response.json()
username = response_data["username"]  # ❌ Clé inexistante

# Solution : Vérifier le contenu du JSON
print(f"JSON reçu : {response.json()}")
# Puis utiliser la bonne clé ou vérifier qu'elle existe
self.assertIn("username", response_data)
username = response_data["username"]
```

#### Problème : "DoesNotExist: User matching query does not exist"

```python
# Le test essaie d'utiliser un utilisateur qui n'existe pas
user = User.objects.get(username="NonExistentUser")  # ❌

# Solution : Vérifier que l'utilisateur est créé dans setUp()
def setUp(self):
    self.user = User.objects.create_user(
        "TestUser",  # ✅ Bien s'assurer du nom
        email="test@example.com",
        password="TestPassword123"
    )
```

---

## 📋 Bonnes pratiques

### 1. Nommage des tests

```python
# ✅ BON : Nom explicite
def test_login_with_correct_credentials_returns_user_data(self):
    pass

def test_login_with_invalid_password_returns_401_error(self):
    pass

def test_get_user_profile_while_logged_out_returns_401(self):
    pass

# ❌ MAUVAIS : Nom vague
def test_login(self):
    pass

def test_user_stuff(self):
    pass
```

### 2. Structure AAA (Arrange, Act, Assert)

```python
def test_login_with_correct_credentials(self):
    # ARRANGE : Préparer les données
    username = "TestUser"
    password = "TestPassword123"
    login_data = {"username": username, "password": password}
    
    # ACT : Exécuter l'action
    response = self.client.post("/api/login", 
                              content_type="application/json", 
                              data=login_data)
    
    # ASSERT : Vérifier les résultats
    self.assertEqual(response.status_code, 200)
    response_data = response.json()
    self.assertEqual(response_data["username"], username)
    self.assertIn("access_token", response.cookies)
```

### 3. Un test = une fonctionnalité

```python
# ✅ BON : Un test teste une chose
def test_login_with_correct_credentials_succeeds(self):
    # Teste seulement la connexion réussie
    pass

def test_login_sets_access_token_cookie(self):
    # Teste seulement que le cookie est défini
    pass

def test_login_returns_user_profile_data(self):
    # Teste seulement que les données utilisateur sont renvoyées
    pass

# ❌ MAUVAIS : Un test teste plusieurs choses
def test_login_does_everything(self):
    # Teste la connexion ET les cookies ET les données ET les permissions...
    pass
```

### 4. Isolation des tests

```python
# ✅ BON : Chaque test est indépendant
class AuthTests(TestCase):
    def setUp(self):
        # Données fraîches pour chaque test
        self.user = User.objects.create_user("test", "test@test.com", "pass123")
    
    def test_login_success(self):
        # Utilise self.user
        pass
    
    def test_login_failure(self):
        # Utilise self.user (différent du test précédent)
        pass

# ❌ MAUVAIS : Tests dépendants
class AuthTests(TestCase):
    def test_create_user(self):
        User.objects.create_user("test", "test@test.com", "pass123")
    
    def test_login_user(self):
        # DÉPEND du test précédent !
        pass
```

### 5. Messages d'assertion clairs

```python
# ✅ BON : Message explicite
self.assertEqual(
    response.status_code, 
    200, 
    "La connexion avec des identifiants corrects devrait réussir"
)

self.assertIn(
    "access_token", 
    response.cookies,
    "Un token d'accès devrait être défini dans les cookies après connexion"
)

# ❌ MAUVAIS : Pas de message
self.assertEqual(response.status_code, 200)
self.assertIn("access_token", response.cookies)
```

### 6. Tests de cas limites

```python
# Tester les cas normaux
def test_login_with_correct_credentials(self):
    pass

# Mais aussi les cas d'erreur
def test_login_with_empty_username(self):
    pass

def test_login_with_empty_password(self):
    pass

def test_login_with_nonexistent_user(self):
    pass

def test_login_with_incorrect_password(self):
    pass

def test_login_with_too_long_username(self):
    pass

# Et les cas extrêmes
def test_login_with_sql_injection_attempt(self):
    pass

def test_login_with_unicode_characters(self):
    pass
```

---

## 🎯 Commandes de test par niveau

### Débutant

```bash
# Lancer tous les tests d'une app
python manage.py test users --verbosity=2

# Lancer un fichier de test
python manage.py test users.tests.test_auth_endpoints --verbosity=2

# Lancer un test spécifique
python manage.py test users.tests.test_auth_endpoints.AuthEndpointsTests.test_login_with_correct_credentials --verbosity=2
```

### Intermédiaire

```bash
# Tests multiples avec conservation de la DB
python manage.py test users.tests.test_auth_endpoints users.tests.test_mfa_endpoints --keepdb --verbosity=2

# Arrêter au premier échec
python manage.py test users --failfast --verbosity=2

# Mode debug pour plus d'infos
python manage.py test users.tests.test_auth_endpoints --debug-mode --verbosity=2
```

### Avancé

```bash
# Pattern pour tests spécifiques
python manage.py test --pattern="*auth*" --verbosity=2

# Tests en parallèle (plus rapide)
python manage.py test --parallel --verbosity=2

# Tests avec coverage (nécessite pip install coverage)
coverage run --source='.' manage.py test
coverage report
coverage html  # Génère un rapport HTML
```

---

## 🆘 Que faire en cas de problème ?

### 1. Le conteneur Docker ne démarre pas
```bash
# Vérifier les logs
make logs

# Redémarrer proprement
make down
make up
```

### 2. Les migrations ne passent pas
```bash
# Dans le conteneur
python manage.py makemigrations
python manage.py migrate
```

### 3. Les tests échouent tous
```bash
# Vérifier que la base de test se crée bien
python manage.py test --dry-run --verbosity=3

# Tester un test simple d'abord
python manage.py test users.tests.test_users_endpoints.UsersEndpointsTests.test_get_users_while_logged_out --verbosity=2
```

### 4. Import errors
```bash
# Vérifier la structure Python
python -c "import users.tests.test_auth_endpoints; print('OK')"
```

### 5. Permission denied
```bash
# Vérifier les permissions
ls -la users/tests/
chmod +r users/tests/test_*.py
```

---

## 📈 Métriques de tests

### Compter les tests
```bash
# Voir tous les tests qui seraient exécutés
python manage.py test --dry-run

# Compter les tests par app
python manage.py test users --dry-run | grep -c "test_"
python manage.py test chat --dry-run | grep -c "test_"
```

### Temps d'exécution
```bash
# Chronométrer les tests
time python manage.py test users.tests.test_auth_endpoints

# Tests avec timing détaillé
python manage.py test users.tests.test_auth_endpoints --verbosity=2 --timing
```

---

🎉 **Félicitations !** Vous savez maintenant tout ce qu'il faut pour lancer, comprendre et déboguer les tests de Transcendence !

*N'hésitez pas à expérimenter avec des petits changements dans les tests pour voir comment ils réagissent. C'est en pratiquant qu'on apprend !*