## Architecture
- [ ] Change views to explicitely return status codes and error messages.

## Features
- [~] User profiles with their information.
    - [x] Implement match history and resolution.
    - [x] Implement misc stats like the scored balls or best/worst enemy.
    - [ ] Implement tournament history.
    - [ ] Implement user settings update.
    - [ ] Implement validation for the images of user avatars.
        - [ ] Images should not be too big, bigger than 10mb.
        - [ ] Accepted formats should be: .png, .jpg, .webp.
            - [ ] Both filenames and their contents should be checked.
            - [ ] Frontend should have `accept` attribue with the list of those file types.
- [ ] User creation.
    - [x] User email should be valid.
        - [ ] OPTIONAL: send a validation email to a user.
    - [ ] Implement validation of passwords on their security.
        - [x] Passwords should have min len.
        - [x] Passwords should not contain username.
        - [ ] Passwords should have at least 1 digit and 1 letter.
        - [ ] Passwords should not have X amount of repeated characters.
- [ ] JWT auth on the backend.
- [ ] Friends list.
- [ ] Realtime online status.
- [x] Elo system.
