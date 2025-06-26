# 🧪 Complete Testing Guide - Transcendence Project

This guide explains how to use and understand unit tests in the Transcendence project, from A to Z, even if you've never done testing before.

## 📚 Table of Contents

1. [What are unit tests?](#what-are-unit-tests-)
2. [Starting the environment](#starting-the-environment)
3. [Test structure](#test-structure)
4. [Running tests](#running-tests)
5. [Understanding options](#understanding-options)
6. [Understanding assertions](#understanding-assertions)
7. [Test lifecycle](#test-lifecycle)
8. [Interpreting results](#interpreting-results)
9. [Debugging tests](#debugging-tests)
10. [Best practices](#best-practices)

---

## 🤔 What are unit tests?

**Unit tests** are small programs that automatically verify that your code works as expected. Imagine you're testing a calculator:

```python
def test_addition():
    result = calculate(2 + 3)
    assert result == 5  # Verifies that 2+3 equals 5
```

In our Transcendence project, we test **API endpoints** (the URLs that the frontend calls) to verify that they:
- Return the correct data
- Handle errors properly
- Respect permissions
- Work in all scenarios

---

## 🐳 Starting the environment

### 1. Start Docker

Before running tests, you need to start the Docker environment:

```bash
# Go to the project folder
cd /path/to/projectFolder

# Start all Docker services
make up
```

**What happens?** This command launches:
- 🗄️ A PostgreSQL database
- 🐍 Django server (backend)
- 🌐 Frontend server (Vite)
- 🔧 Nginx (proxy)
- ⏰ A scheduled tasks service

### 2. Verify everything works

```bash
# Check that containers are running
docker ps

# You should see 5 running containers
```

### 3. Enter the backend container

```bash
# Method 1: With Make (recommended)
make bash-backend

# Method 2: Directly with Docker
docker exec -it server bash
```

**You are now inside the Django container** where you can run tests!

---

## 📁 Test structure

### File organization

```
server/
├── users/tests/
│   ├── test_auth_endpoints.py      # Authentication tests
│   ├── test_mfa_endpoints.py       # MFA (2FA) tests
│   ├── test_oauth2_endpoints.py    # OAuth tests (GitHub, 42)
│   └── test_users_endpoints.py     # User management tests
├── chat/tests/
│   ├── test_chat_endpoints.py      # Chat and messages tests
│   └── test_notifications_endpoints.py # Notifications tests
├── pong/tests/
│   └── test_game_stats_endpoints.py # Game statistics tests
└── tournaments/tests/
    └── test_tournaments_endpoints.py # Tournament tests
```

### Anatomy of a test file

```python
import logging
from django.test import TestCase
from users.models import User

class AuthEndpointsTests(TestCase):  # Test class
    
    def setUp(self):  # Setup before each test
        """Executed BEFORE each individual test"""
        logging.disable(logging.CRITICAL)  # Disable logs
        # Create test data
        self.user = User.objects.create_user(
            "TestUser", 
            email="test@example.com", 
            password="TestPassword123"
        )
    
    def tearDown(self):  # Cleanup after each test
        """Executed AFTER each individual test"""
        logging.disable(logging.NOTSET)  # Re-enable logs
        # Django automatically deletes test data
    
    def test_login_with_correct_credentials(self):  # One test
        """Test that login works with correct credentials"""
        # Arrange: Prepare data
        data = {"username": "TestUser", "password": "TestPassword123"}
        
        # Act: Execute the action to test
        response = self.client.post("/api/login", 
                                  content_type="application/json", 
                                  data=data)
        
        # Assert: Verify the result
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["username"], "TestUser")
```

---

## 🚀 Running tests

### Basic commands

```bash
# IMPORTANT: You must be inside the backend container
# (use `make bash-backend` from the project root)

# 1. Run ALL project tests
python manage.py test

# 2. Run all tests for an app
python manage.py test users
python manage.py test chat
python manage.py test pong
python manage.py test tournaments

# 3. Run a specific test file
python manage.py test users.tests.test_auth_endpoints

# 4. Run a specific test class
python manage.py test users.tests.test_auth_endpoints.AuthEndpointsTests

# 5. Run an individual test
python manage.py test users.tests.test_auth_endpoints.AuthEndpointsTests.test_login_with_correct_credentials
```

### Run only the newly created tests

```bash
# All new endpoint tests in one command
python manage.py test \
  users.tests.test_auth_endpoints \
  users.tests.test_mfa_endpoints \
  users.tests.test_oauth2_endpoints \
  chat.tests.test_chat_endpoints \
  chat.tests.test_notifications_endpoints \
  pong.tests.test_game_stats_endpoints \
  tournaments.tests.test_tournaments_endpoints
```

### Tests by theme

```bash
# Authentication tests only
python manage.py test \
  users.tests.test_auth_endpoints \
  users.tests.test_mfa_endpoints \
  users.tests.test_oauth2_endpoints

# Communication tests (chat + notifications)
python manage.py test \
  chat.tests.test_chat_endpoints \
  chat.tests.test_notifications_endpoints

# Game tests
python manage.py test \
  pong.tests.test_game_stats_endpoints \
  tournaments.tests.test_tournaments_endpoints
```

---

## ⚙️ Understanding options

### The `--verbosity` option (detail level)

```bash
# --verbosity=0 : Silent (errors only)
python manage.py test users.tests.test_auth_endpoints --verbosity=0

# --verbosity=1 : Basic (default)
python manage.py test users.tests.test_auth_endpoints --verbosity=1

# --verbosity=2 : Detailed (recommended for debugging)
python manage.py test users.tests.test_auth_endpoints --verbosity=2

# --verbosity=3 : Very detailed (all information)
python manage.py test users.tests.test_auth_endpoints --verbosity=3
```

**Example output with verbosity=2:**
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

### Other useful options

```bash
# --keepdb : Keep test database (faster for repeated tests)
python manage.py test users.tests.test_auth_endpoints --keepdb

# --reverse : Run tests in reverse order
python manage.py test users.tests.test_auth_endpoints --reverse

# --debug-mode : Debug mode (shows more info on errors)
python manage.py test users.tests.test_auth_endpoints --debug-mode

# --failfast : Stop at first failing test
python manage.py test users.tests.test_auth_endpoints --failfast

# --dry-run : Show which tests would run without executing them
python manage.py test users.tests.test_auth_endpoints --dry-run
```

---

## 🔍 Understanding assertions

**Assertions** are verifications we make in tests. If an assertion fails, the test fails.

### Basic assertions

```python
# 1. Equality
self.assertEqual(a, b)          # Verifies that a == b
self.assertNotEqual(a, b)       # Verifies that a != b

# Concrete examples
self.assertEqual(response.status_code, 200)  # Server responded successfully
self.assertEqual(user.username, "TestUser")  # Username is correct

# 2. Truth/Falsy
self.assertTrue(condition)      # Verifies that condition is True
self.assertFalse(condition)     # Verifies that condition is False

# Examples
self.assertTrue(user.is_active)     # User is active
self.assertFalse(user.is_staff)     # User is not admin

# 3. Presence/Absence
self.assertIsNone(value)        # Verifies that value is None
self.assertIsNotNone(value)     # Verifies that value is not None

# Examples
self.assertIsNone(user.last_login)       # First login
self.assertIsNotNone(response.json())    # Response contains JSON

# 4. Collections
self.assertIn(item, collection)     # Verifies that item is in collection
self.assertNotIn(item, collection)  # Verifies that item is not in collection

# Examples
self.assertIn("username", response.json())           # JSON contains "username"
self.assertIn("access_token", response.cookies)      # Cookies contain token
```

### Web-specific assertions

```python
# 1. HTTP status code
self.assertEqual(response.status_code, 200)  # Success
self.assertEqual(response.status_code, 401)  # Unauthorized
self.assertEqual(response.status_code, 404)  # Not found
self.assertEqual(response.status_code, 422)  # Invalid data

# 2. Response content
self.assertContains(response, "text", status_code=200)
# Verifies that response contains "text" AND status code is 200

# Examples
self.assertContains(response, "Username or password are not correct", status_code=401)
self.assertContains(response, "Account successfully deleted", status_code=200)

# 3. JSON
response_data = response.json()
self.assertEqual(response_data["username"], "TestUser")
self.assertIn("access_token", response.cookies)
```

### Comparisons with custom messages

```python
# Add explanatory message if assertion fails
self.assertEqual(
    response.status_code, 
    200, 
    "Login should succeed with correct credentials"
)

self.assertEqual(
    response.json()["username"], 
    "TestUser", 
    "Username in response should be 'TestUser'"
)
```

---

## 🔄 Test lifecycle

### Execution order

```python
class MyTestCase(TestCase):
    
    @classmethod
    def setUpClass(cls):
        """1. Executed ONCE at the beginning of the class"""
        super().setUpClass()
        # Global setup for all tests
        print("🏗️  Class setup")
    
    def setUp(self):
        """2. Executed BEFORE EACH individual test"""
        print("🔧 Test preparation")
        # Create test data
        self.user = User.objects.create_user("test", "test@test.com", "pass123")
    
    def test_something(self):
        """3. The test itself"""
        print("🧪 Test execution")
        # Your test here
        response = self.client.post("/api/login", data={...})
        self.assertEqual(response.status_code, 200)
    
    def tearDown(self):
        """4. Executed AFTER EACH individual test"""
        print("🧹 Test cleanup")
        # Django automatically cleans the database
        # You can add custom cleanup here
    
    @classmethod
    def tearDownClass(cls):
        """5. Executed ONCE at the end of the class"""
        super().tearDownClass()
        print("🏁 Class cleanup")
```

### Example with multiple tests

```python
class AuthTests(TestCase):
    
    def setUp(self):
        print("🔧 Creating test user")
        self.user = User.objects.create_user("test", "test@test.com", "pass123")
    
    def test_login_success(self):
        print("🧪 Testing successful login")
        # This test uses self.user created in setUp()
        
    def test_login_failure(self):
        print("🧪 Testing failed login") 
        # This test ALSO uses self.user (new setUp() called)
    
    def tearDown(self):
        print("🧹 Cleanup after test")
        # self.user is automatically deleted by Django
```

**Execution order:**
```
🏗️  Class setup
🔧 Creating test user
🧪 Testing successful login
🧹 Cleanup after test
🔧 Creating test user  (new setUp for 2nd test)
🧪 Testing failed login
🧹 Cleanup after test
🏁 Class cleanup
```

### Why setUp/tearDown?

```python
# ❌ BAD: Tests dependent on each other
class BadTests(TestCase):
    def test_create_user(self):
        user = User.objects.create_user("test", "test@test.com", "pass123")
        # User remains in database
    
    def test_login_user(self):
        # This test DEPENDS on the previous test!
        # If test_create_user fails, this one fails too
        response = self.client.post("/api/login", ...)

# ✅ GOOD: Independent tests
class GoodTests(TestCase):
    def setUp(self):
        # Each test has its own fresh data
        self.user = User.objects.create_user("test", "test@test.com", "pass123")
    
    def test_create_user(self):
        # Independent test with self.user
        
    def test_login_user(self):
        # Independent test with self.user (different from previous test)
```

---

## 📊 Interpreting results

### Successful test

```bash
test_login_with_correct_credentials (users.tests.test_auth_endpoints.AuthEndpointsTests) ... ok

----------------------------------------------------------------------
Ran 1 test in 0.834s

OK
```

**Meaning:**
- ✅ `ok`: Test passed
- ⏱️ `0.834s`: Test took 0.834 seconds
- 🎉 `OK`: All tests passed

### Failed test

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

**Meaning:**
- ❌ `FAIL`: Test failed
- 📍 `line 58`: Error is at line 58
- 🔍 `AssertionError: 422 != 404`: Expected 404, got 422
- 📈 `failures=1`: 1 test failed

### Test with error

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

**Difference between FAIL and ERROR:**
- 🔴 **FAIL**: An assertion failed (unexpected behavior)
- 💥 **ERROR**: Code crashed (bug in the test)

### Skipped tests

```bash
test_something (app.tests.TestCase) ... skipped 'Reason for skipping'
```

**Used with:**
```python
from unittest import skip

@skip("This feature is not yet implemented")
def test_future_feature(self):
    pass
```

---

## 🐛 Debugging tests

### 1. Run a single test to isolate the problem

```bash
# Instead of running all tests
python manage.py test users.tests.test_auth_endpoints

# Run just the problematic test
python manage.py test users.tests.test_auth_endpoints.AuthEndpointsTests.test_login_with_correct_credentials --verbosity=2
```

### 2. Add debug prints

```python
def test_login_with_correct_credentials(self):
    data = {"username": "TestUser", "password": "TestPassword123"}
    
    print(f"🔍 Data sent: {data}")  # Debug
    
    response = self.client.post("/api/login", 
                              content_type="application/json", 
                              data=data)
    
    print(f"🔍 Response code: {response.status_code}")  # Debug
    print(f"🔍 Response content: {response.content}")  # Debug
    
    self.assertEqual(response.status_code, 200)
```

### 3. Use Python debugger

```python
def test_login_with_correct_credentials(self):
    data = {"username": "TestUser", "password": "TestPassword123"}
    
    import pdb; pdb.set_trace()  # Breakpoint
    
    response = self.client.post("/api/login", 
                              content_type="application/json", 
                              data=data)
    
    self.assertEqual(response.status_code, 200)
```

### 4. Examine test database

```python
def test_something(self):
    # See all created users
    users = User.objects.all()
    print(f"🔍 Users in database: {[u.username for u in users]}")
    
    # Check if user exists
    user_exists = User.objects.filter(username="TestUser").exists()
    print(f"🔍 TestUser exists: {user_exists}")
```

### 5. Common problems and solutions

#### Problem: "AssertionError: 422 != 404"

```python
# Code expects 404 error but receives 422
self.assertEqual(response.status_code, 404)  # ❌ Expected
# But server returns 422 (invalid data)

# Solution: Check what the endpoint actually returns
print(f"Code received: {response.status_code}")
print(f"Message: {response.content}")
# Then adjust the test
self.assertEqual(response.status_code, 422)  # ✅ Fixed
```

#### Problem: "KeyError: 'username'"

```python
# Test tries to access a non-existent key
response_data = response.json()
username = response_data["username"]  # ❌ Non-existent key

# Solution: Check JSON content
print(f"JSON received: {response.json()}")
# Then use correct key or check it exists
self.assertIn("username", response_data)
username = response_data["username"]
```

#### Problem: "DoesNotExist: User matching query does not exist"

```python
# Test tries to use a non-existent user
user = User.objects.get(username="NonExistentUser")  # ❌

# Solution: Check that user is created in setUp()
def setUp(self):
    self.user = User.objects.create_user(
        "TestUser",  # ✅ Make sure of the name
        email="test@example.com",
        password="TestPassword123"
    )
```

---

## 📋 Best practices

### 1. Test naming

```python
# ✅ GOOD: Explicit name
def test_login_with_correct_credentials_returns_user_data(self):
    pass

def test_login_with_invalid_password_returns_401_error(self):
    pass

def test_get_user_profile_while_logged_out_returns_401(self):
    pass

# ❌ BAD: Vague name
def test_login(self):
    pass

def test_user_stuff(self):
    pass
```

### 2. AAA structure (Arrange, Act, Assert)

```python
def test_login_with_correct_credentials(self):
    # ARRANGE: Prepare data
    username = "TestUser"
    password = "TestPassword123"
    login_data = {"username": username, "password": password}
    
    # ACT: Execute action
    response = self.client.post("/api/login", 
                              content_type="application/json", 
                              data=login_data)
    
    # ASSERT: Verify results
    self.assertEqual(response.status_code, 200)
    response_data = response.json()
    self.assertEqual(response_data["username"], username)
    self.assertIn("access_token", response.cookies)
```

### 3. One test = one feature

```python
# ✅ GOOD: One test tests one thing
def test_login_with_correct_credentials_succeeds(self):
    # Tests only successful login
    pass

def test_login_sets_access_token_cookie(self):
    # Tests only that cookie is set
    pass

def test_login_returns_user_profile_data(self):
    # Tests only that user data is returned
    pass

# ❌ BAD: One test tests multiple things
def test_login_does_everything(self):
    # Tests login AND cookies AND data AND permissions...
    pass
```

### 4. Test isolation

```python
# ✅ GOOD: Each test is independent
class AuthTests(TestCase):
    def setUp(self):
        # Fresh data for each test
        self.user = User.objects.create_user("test", "test@test.com", "pass123")
    
    def test_login_success(self):
        # Uses self.user
        pass
    
    def test_login_failure(self):
        # Uses self.user (different from previous test)
        pass

# ❌ BAD: Dependent tests
class AuthTests(TestCase):
    def test_create_user(self):
        User.objects.create_user("test", "test@test.com", "pass123")
    
    def test_login_user(self):
        # DEPENDS on previous test!
        pass
```

### 5. Clear assertion messages

```python
# ✅ GOOD: Explicit message
self.assertEqual(
    response.status_code, 
    200, 
    "Login with correct credentials should succeed"
)

self.assertIn(
    "access_token", 
    response.cookies,
    "Access token should be set in cookies after login"
)

# ❌ BAD: No message
self.assertEqual(response.status_code, 200)
self.assertIn("access_token", response.cookies)
```

### 6. Edge case testing

```python
# Test normal cases
def test_login_with_correct_credentials(self):
    pass

# But also error cases
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

# And extreme cases
def test_login_with_sql_injection_attempt(self):
    pass

def test_login_with_unicode_characters(self):
    pass
```

---

## 🎯 Test commands by level

### Beginner

```bash
# Run all tests for an app
python manage.py test users --verbosity=2

# Run a test file
python manage.py test users.tests.test_auth_endpoints --verbosity=2

# Run a specific test
python manage.py test users.tests.test_auth_endpoints.AuthEndpointsTests.test_login_with_correct_credentials --verbosity=2
```

### Intermediate

```bash
# Multiple tests with DB preservation
python manage.py test users.tests.test_auth_endpoints users.tests.test_mfa_endpoints --keepdb --verbosity=2

# Stop at first failure
python manage.py test users --failfast --verbosity=2

# Debug mode for more info
python manage.py test users.tests.test_auth_endpoints --debug-mode --verbosity=2
```

### Advanced

```bash
# Pattern for specific tests
python manage.py test --pattern="*auth*" --verbosity=2

# Parallel tests (faster)
python manage.py test --parallel --verbosity=2

# Tests with coverage (requires pip install coverage)
coverage run --source='.' manage.py test
coverage report
coverage html  # Generates HTML report
```

---

## 🆘 What to do in case of problems?

### 1. Docker container won't start
```bash
# Check logs
make logs

# Clean restart
make down
make up
```

### 2. Migrations don't pass
```bash
# Inside container
python manage.py makemigrations
python manage.py migrate
```

### 3. All tests fail
```bash
# Check that test database creates properly
python manage.py test --dry-run --verbosity=3

# Test a simple test first
python manage.py test users.tests.test_users_endpoints.UsersEndpointsTests.test_get_users_while_logged_out --verbosity=2
```

### 4. Import errors
```bash
# Check Python structure
python -c "import users.tests.test_auth_endpoints; print('OK')"
```

### 5. Permission denied
```bash
# Check permissions
ls -la users/tests/
chmod +r users/tests/test_*.py
```

---

## 📈 Test metrics

### Count tests
```bash
# See all tests that would be executed
python manage.py test --dry-run

# Count tests per app
python manage.py test users --dry-run | grep -c "test_"
python manage.py test chat --dry-run | grep -c "test_"
```

### Execution time
```bash
# Time tests
time python manage.py test users.tests.test_auth_endpoints

# Tests with detailed timing
python manage.py test users.tests.test_auth_endpoints --verbosity=2 --timing
```

---

🎉 **Congratulations!** You now know everything you need to run, understand, and debug Transcendence tests!

*Don't hesitate to experiment with small changes in the tests to see how they react. Practice makes perfect!*