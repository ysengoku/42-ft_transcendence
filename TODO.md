USER INTERFACE
    - User clicks matchmaking

ON CONNECT
    - Websocket connection is established
    - Server sends the player id to the matchmaking worker with event OPEN
    - Matchmaking worker creates a new ticket

ON DISCONNECT
    - Server sends the player id to the matchmaking worker with event CLOSE

MATCHMAKING LOOP
    - Matchmaking worker loops over all of the unclosed tickets and tries to find a match
        - Matchmaking worker loops over the tickets every 0.2 seconds
    - Elo range of the players gradually increases every 5 seconds
    - If the match was found, worker sends the matched players id and match id to the server

ON MATCH FOUND
    - Server sends corresponding events to the players
    - Players can decline or accept
        - On mutual accept, server sends player id to the matchmaking worker with event ACCEPT
        - On decline, server sends player id to the worker with event DECLINE

MATCHMAKING WORKER: ACCEPT player1_id player2_id
    - Waits for the other player acceptance for 5 seconds
    - Check acceptance of the players every 0.2 seconds
        - If the other player didn't accept, return the player to the queue
        - If both players accepted, remove them to the queue, send both players id to the server with event GAME_START

MATCHMAKING WORKER: DECLINE player_id
    - Remove the player from the queue


