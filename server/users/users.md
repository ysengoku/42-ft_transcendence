# Users app
Django app that is responsible for the authentication and authorization of users for the project.

## `User` and `Profile`
There are two quintessential models that this app manages: `User` and `Profile`. The difference between them is that `User` is an extension of the default Django model, and is used purely for the purposes of authentication and autorization, or who this user is and does they have an access to the requested recourse. Each `User` has its own `Profile`, which operates on the data that is not specific to authentication, and is related to the actual functionality of the project, like the ability to add and remove friends, block users, elo, profile picture...

`User` and `Profile` models have one to one relationships: each `User` has its own `Profile`, which is automatically created for them. Both models also have a number of models related to them in either one to one or one to many relationships. This is especially true for `Profile`: since it is related to the actual application logic, it is used by every other app in the project. On the other hand, `User` is connected by other models of the Users app, which are also related to auth.

The rest of the app revolves around those models: the implementation of the JWT authentication, endpoints for signing up, signing in, creating and getting the data needed for profile pages, friend/block lists.
