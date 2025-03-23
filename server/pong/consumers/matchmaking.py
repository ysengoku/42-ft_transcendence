import json

from channels.generic.websocket import AsyncWebsocketConsumer

"""
example protocol
flowchart TD
    A[Player clicks "Find Match"] --> B[HTTP POST to /matchmaking]
    B --> C[Create Matchmaking Ticket]
    C --> D[Matchmaking Worker scans tickets]
    D --> E{Match Found?}
    E -- Yes --> F[Update tickets & create match record]
    F --> G[Send match found event via WebSocket]
    G --> H[Players receive notification & respond]
    H -- Accept --> I[Finalize match & notify clients]
    H -- Decline --> J[Remove ticket & re-queue accepted players]
"""

"""
user connects and creates ticket
"""

class MatchmakingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        if not self.user:
            await self.close()
            return

        # user connects
        #     -> search for matchmaking ticket
        #           -> if found, startgame
        #           -> if not found, create a ticket with one pending player
        await self.accept()

    async def disconnect(self, code: int):
        pass

    async def receive(self, text_data):
        pass

    async def find_pending_players():
        pass

    async def search_match(self, message: dict):
        await self.send(text_data=json.dumps({"id": self.user.id}))
