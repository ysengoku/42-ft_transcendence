# Feeback from Simon's correction

# Buggyy things

- API 42 : should not ask for so many autorisations : only who it is
- button `prev` on the profile gives this error :

```js
Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'reverse')
    at V0.parseData (EloProgressionChart.js:312:19)
    at V0.renderChart (EloProgressionChart.js:125:10)
    at V0.renderPrevious (EloProgressionChart.js:385:10)
```

- Error at the beginning of a tournament, with people on different computers :

```js
TournamentMenu.js:405 Uncaught TypeError: Cannot read properties of null (reading 'contains')
    at TournamentMenu.handleCloseModal (TournamentMenu.js:405:29)
```

# Suggestions

- anonymise pictures' names when they are downloaded
