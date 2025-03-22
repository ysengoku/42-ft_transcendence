import json

from channels.consumer import AsyncConsumer

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

class MatchmakingConsumer(AsyncConsumer):
    async def search_match(self, message: dict):
        if not self.user:
            return

        await self.send(text_data=json.dumps({"id": self.user.id}))
