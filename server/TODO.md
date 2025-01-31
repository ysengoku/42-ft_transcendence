## Architecture
- [ ] Change views to explicitely return status codes and error messages.
- [ ] Delete get all users endpoint.
- [ ] Look into DATA_UPLOAD_MAX_DATA_MEMORY_SIZE setting and its exception.
  - [ ] Do it specifically for the `validate_avatar` function.
- [ ] Resolve trailing slash situation.

## Fixes
- [ ] Fix friends and blocked users: they shouldn't be able to add themselves.
- [ ] Friends should be added on both sides.

## Features
- [~] User profiles.
  - [ ] Implement tournament history.
  - [x] Implement match history and resolution.
  - [x] Implement misc stats like the scored balls or best/worst enemy.
  - [~] Implement user settings update endpoint.
      - [x] Implement validation for the images of user avatars.
          - [x] Images should not be too big, bigger than 10mb.
          - [x] Accepted formats should be: .png, .jpg, .webp.
              - [x] Both filenames and their contents should be checked.
  - [ ] Online status tracking.
- [ ] User creation.
  - [x] User email should be valid.
      - [ ] OPTIONAL: send a validation email to a user.
  - [~] Implement validation of passwords on their security.
    - [x] Passwords should have min len.
    - [x] Passwords should not contain username.
    - [ ] Passwords should have at least 1 digit and 1 letter.
    - [ ] Passwords should not have X amount of repeated characters.
- [ ] JWT auth on the backend.
    - [ ] Implement login endpoint.
    - [ ] Implement CSRF protection.
    - [ ] Implement JWT verifications on each of the endpoints, except login and user creation endpoints.
    - [ ] Implement refresh tokens.
- [x] Friendship system.
    - [x] Addition and deletion operations for friends.
    - [x] Friends should be sorted by their online status.
- [x] User blocking system.
  - [x] Addition and deletion operations for blocked user list.
- [ ] Realtime online status.
- [x] Elo system.
- [~] Redo the User model to make it compatible with OAuth.
   - [x] Change the validation for the User in all places.
   - [ ] Change the API views so they could be able to find and return different types of users.
