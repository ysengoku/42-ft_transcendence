## Architecture
- [x] Change views to explicitely return status codes and error messages.
- [x] Delete get all users endpoint.
- [ ] Look into DATA_UPLOAD_MAX_DATA_MEMORY_SIZE setting and its exception.
    - [ ] Do it specifically for the `validate_avatar` function.
- [ ] Resolve trailing slash situation.
- [ ] Replace with `validate_and_create_user` method on user creation endpoint.

## Fixes
- [x] Fix friends and blocked users: they shouldn't be able to add themselves.
- [x] Fix friends and blocked users: you can't add blocked user as a friend.

## Features
### User Management & Auth
- [~] User profiles.
    - [ ] Implement tournament history.
    - [x] Implement match history and resolution.
    - [x] Implement misc stats like the scored balls or best/worst enemy.
    - [~] Implement user settings update endpoint.
    - [x] Implement validation for the images of user avatars.
        - [x] Images should not be too big, bigger than 10mb.
        - [x] Accepted formats should be: .png, .jpg, .webp.
            - [x] Both filenames and their contents should be checked.
    - [x] Add `is_blocked`, `is_blocked_by` and `is_friend` data on `FullProfileSchema`.
- [ ] User creation.
    - [x] User email should be valid.
      - [ ] OPTIONAL: send a validation email to a user.
  - [~] Implement validation of passwords on their security.
    - [x] Passwords should have min len.
    - [x] Passwords should not contain username.
    - [x] Passwords should have at least 1 digit and 1 letter.
- [~] JWT auth on the backend.
    - [x] Implement signup endpoint.
    - [x] Implement login endpoint.
    - [x] Implement logout endpoint.
    - [x] Implement CSRF protection.
    - [x] Implement JWT verifications on each of the endpoints, except login and user creation endpoints.
    - [x] Implement refresh tokens.
        - [x] Issue refresh tokens on user creation.
        - [x] Issue refresh tokens on login.
        - [x] Rotate refresh tokens on refresh.
        - [x] Revoke refresh tokens on logout.
        - [x] Change JWT payload from `username` to `id` to make user identifier non-volatile.
    - [ ] Add to cookies `HTTP-only`, `Secure`, `SameSite=Strict`.
    - [ ] Add expiration date to the cookies.
- [x] Friendship system.
    - [x] Addition and deletion operations for friends.
    - [x] Friends should be sorted by their online status.
- [x] User blocking system.
    - [x] Addition and deletion operations for blocked user list.
- [ ] Realtime online status.
    - [ ] Online status tracking.
- [x] Elo system.
- [~] Redo the User model to make it compatible with OAuth.
    - [x] Change the validation for the User in all places.

### Chat
- [ ] Add authentication support to the consumers.
- [ ] It is possible to determine how the connection was closed based on the status code.
    - `1001` is send automatically on closing or refreshing the browser tab.
    - `1006` means that the connection was closed due to the network error or by any other abnormal means.
    - `websocketInstance.close({status_code})` can be sent from the client.
        - `1000` means `NORMAL_CLOSURE`, that the client intentionally closed the connection.

## Reworks
- [x] `username`'s are not slugified, like `slug_id`
- [x] Postfixes to colliding `username`'s are still added, but only in the case oauth connection. If non-oauth user tries to register an account with the `username` that already exists, it's always an error, even if the username exists on oauth account.
- [x] We add non-unique `nickname`.
- [x] On user creation, user may provide `nickname`. If not, the default  `nickname` is `username`.
