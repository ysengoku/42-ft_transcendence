# Login flow

User sends a login form (e.g. username and password) from '/login'

If authenticated, JSON response with user's informations is returned.
Exmaple of response:

```json
{
  "id": "123",
  "username": "john"
}
```

New URL is created using `id`

```js
const response = {
  id: "123",
  username: "john",
};

const userProfilUrl = "/profile/${response.id}"; // 'profile/123'
```

URL is update and new content is rendered

---

If not authenticated,
username and password zones will be red framed (URL doesn't change)
