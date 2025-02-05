- On the client, it's better to store the cookie in memory or as HTTP-only cookie.
    - `localStorage` is more vulnerable to XSS.
    - Cookies are vulnerable to CSRF attacks, but CSRF is much less dangerous than XSS. CSRF can be protected from 

- `jwt.decode` should decode a hard coded algorithm from the function instead of relying on the `alg` from the JWT header.
https://pyjwt.readthedocs.io/en/stable/api.html#jwt.decode
Do not compute the algorithms parameter based on the alg from the token itself, or on any other data that an attacker may be able to influence, as that might expose you to various vulnerabilities.
