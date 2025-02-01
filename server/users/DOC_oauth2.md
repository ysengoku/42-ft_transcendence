
# OAuth 2.0

## 42 API

Create an app on 42 intra to get the client ID and secret.:
https://profile.intra.42.fr/oauth/applications/new



https://api.intra.42.fr/apidoc/guides/web_application_flow

1. The app redirects the user to https://api.intra.42.fr/oauth/authorize with client_id, redirect_uri, scope, state.

2. The user logs in and authorizes access.

3. 42 redirects the user to redirect_uri which is the app's URL (http://localhost:1026/...callback") with a code and state query parameter.

5. The app retrieves the code and state.

4. The app verifies state to prevent CSRF attacks.

5. The app sends a POST request to https://api.intra.42.fr/oauth/token with client_id, client_secret, code, and redirect_uri.

6. The 42 API responds with access_token.

7. The app uses access_token to make authenticated requests.
It sends a GET request to https://api.intra.42.fr/v2/me with Authorization: Bearer access_token.

8. The API responds with the user's profile data.

9. The app processes and stores the user information as needed.

10. the app directs the user to the home page in case of success.


#To receive a github client ID + secret, you need to log in to github and then register your app here: github.com/settings/applications/new
# When creating the app, the callback URL should be:
# https://localhost:1026/user/oauth/callback/github/
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
#To receive a 42 api client ID + secret, you need to log in to 42intra and then register your app here: profile.intra.42.fr/oauth/applications/new
# When creating the app, the callback URL should be:
# https://localhost:1026/user/oauth/callback/42api/
API42_CLIENT_ID=xxx
API42_CLIENT_SECRET=xxx

## Github API
Creae an app on github to get the client ID and secret.:
website adress: 
github.com/settings/applications/new