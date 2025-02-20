# OAuth 2.0

rfc6749: https://www.rfc-editor.org/rfc/rfc6749

## 42 API

1. **Create an app on 42 Intra**:  
   Go to [42 Intra OAuth applications](https://profile.intra.42.fr/oauth/applications/new) to get the client ID and secret.

2. **Redirect user to authorization URL**:  
   The app redirects the user to `https://api.intra.42.fr/oauth/authorize` with the following parameters:  
   - `client_id`: Provided by 42 Intra  
   - `redirect_uri`: Chosen by us  
   - `scope`: `profile`  
   - `state`: A unique string, stored in the database to prevent CSRF attacks.

3. **User logs in and authorizes access**:  
   The user logs into their 42 account and grants the requested permissions.

4. **42 redirects back to the app**:  
   After authorization, 42 redirects the user to `redirect_uri` with these query parameters:  
   - `code`: Authorization code  
   - `state`: The same unique state string

5. **Verify state to prevent CSRF**:  
   The app verifies that the `state` parameter matches what was stored in the database to prevent CSRF attacks.

6. **Exchange the code for tokens**:  
   The app sends a POST request to `https://api.intra.42.fr/oauth/token` with:  
   - `client_id`  
   - `client_secret`  
   - `code`: The authorization code  
   - `redirect_uri`: Same as before

7. **Receive access token**:  
   The API responds with an `access_token`.

8. **Use the access token to retrieve user profile**:  
   The app sends a GET request to `https://api.intra.42.fr/v2/me` with:  
   - `Authorization: Bearer {access_token}`

9. **Receive user profile data**:  
   The API responds with the user's profile data.

10. **Process and store user information**:  
   The app processes the user's profile data and stores it as needed.

11. **Redirect user to home page**:  
   After processing, the app redirects the user to the home page.

## Github API

There are 2 types of github apps: OAuth Apps and GitHub Apps. We will use OAuth Apps.
Create an app on github to get the client ID and secret.

https://developer.github.com/apps/building-oauth-apps/authorizing-oauth-apps/

Github OAuth flow works the same way as 42 API, with some other optionnal parameters (for multiple github account for eg.)

TODO: test the flow with a multiple account. 

# ERROR HANDLING

the providers send error codes that are catched by the app, and converted in its own code and sent to a custom error page, which is displayed to the user.


# DATA TO BE STORED IN DATABASE

the access_token is hashed with make password ()


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