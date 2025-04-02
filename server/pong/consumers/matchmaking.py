import json

from channels.generic.websocket import WebsocketConsumer

from pong.models import MatchmakingTicket

"""
flowchart
    A[User clicks "Find match"] --> B[Establishes websocket connection to /ws/matchmaking]
    B --> C[Checks database or creates matchmaking ticket]
    C --> D[Waits for another player]
    D -->
          E[Disconnects] --> F[The ticket is removed from the queue]
          G[Player is found] --> H[Players are redirected to the game route/room]
"""


class MatchmakingConsumer(WebsocketConsumer):
    def connect(self):
        self.user = self.scope.get("user")
        if not self.user:
            self.close()
            return

        self.accept()
        self.match = MatchmakingTicket.objects.filter(status=MatchmakingTicket.PENDING).first()
        if self.match:
            raise Exception("not implemented yet")
        self.match = MatchmakingTicket.objects.create(player=self.user.profile)

    def disconnect(self, code: int):
        self.match.close()

    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        action = text_data_json["action"]
        match action:
            case "cancel":
                self.match.close()
                self.close()
