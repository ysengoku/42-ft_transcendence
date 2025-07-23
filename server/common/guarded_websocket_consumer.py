import logging

import autobahn
from channels.generic.websocket import WebsocketConsumer

from pong.game_protocol import PongCloseCodes

logger = logging.getLogger("server")


class GuardedWebsocketConsumer(WebsocketConsumer):
    def send(self, *args, **kwargs):
        """Custom extended `send` method that handles the case when the user is already disconnected."""
        try:
            super().send(*args, **kwargs)
        except autobahn.exception.Disconnected:
            logger.info("[GameRoom.send]: cannot send the message, player has already left")
            self.close(PongCloseCodes.NORMAL_CLOSURE)
