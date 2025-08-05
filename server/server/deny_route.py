from channels.generic.websocket import WebsocketConsumer

from common.close_codes import CloseCodes


class DenyRoute(WebsocketConsumer):
    """
    Catch-all route that is meant to guard non-existent routes.
    """

    def connect(self):
        self.accept()
        self.close(code=CloseCodes.UNKNOWN_ROUTE)
