# API request authentication

## Access Token (JWT) & Refresh Token

### Case 1 - Access Token is valid
```
router.js:141 Navigating to: /profile/JohnDoe2
apiRequest.js:105 Sending API request: {method: 'GET', headers: {…}, credentials: 'include'}
Profile.js:39 User data: {username: 'JohnDoe2', nickname: 'JohnDoe2', avatar: '/static/images/default_avatar.png', elo: 1000, is_online: true, …}
```

### Case 2 - Access Token is expired, bur Refresh Token is valid
```
Navigating to: /profile/JohnDoe2
apiRequest.js:105 Sending API request: {method: 'GET', headers: {…}, credentials: 'include'}
            
GET https://localhost:1026/api/users/JohnDoe2 401 (Unauthorized)
apiRequest.js:115 Unauthorized request: Response {type: 'basic', url: 'https://localhost:1026/api/users/JohnDoe2', redirected: false, status: 401, ok: false, …}

apiRequest.js:65 Refreshing access token
apiRequest.js:119 Refresh successful
apiRequest.js:105 Sending API request: {method: 'GET', headers: {…}, credentials: 'include'}
Profile.js:39 User data: {username: 'JohnDoe2', nickname: 'JohnDoe2', avatar: '/static/images/default_avatar.png', elo: 1000, is_online: true, …}
```

### Case 3 - Both tokens are expired
```
Navigating to: /profile/JohnDoe2
apiRequest.js:105 Sending API request: {method: 'GET', headers: {…}, credentials: 'include'}
apiRequest.js:108 

GET https://localhost:1026/api/users/JohnDoe2 401 (Unauthorized)

apiRequest.js:65 Refreshing access token
POST https://localhost:1026/api/refresh 401 (Unauthorized)
apiRequest.js:122 Refresh failed

router.js:141 Navigating to: /login
```