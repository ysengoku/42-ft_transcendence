import logging
import time
from collections import deque

import autobahn
from channels.generic.websocket import WebsocketConsumer

from common.close_codes import CloseCodes

logger = logging.getLogger("server")


class GuardedWebsocketConsumer(WebsocketConsumer):
    def send(self, *args, **kwargs):
        """Custom extended `send` method that handles the case when the user is already disconnected."""
        try:
            super().send(*args, **kwargs)
        except autobahn.exception.Disconnected:
            logger.info("[%s.send]: cannot send the message, user has disconnected", self.__class__.__name__)
            self.close(CloseCodes.NORMAL_CLOSURE)

    def init_rate_limiter(self, allowed_requests: int, seconds: int) -> None:
        """
        Attaches rate limiter attributes to the WebsocketConsumer consumers.
        `allowed_requests` is how many requests are allowed per `seconds`.
        if `allowed_reuqests` is 50 and `seonds` is 1, then the rate limit is `50/1s`.
        Creates `rl_allowed_requests`, `rl_seconds` and `rl_requests` on the object.
        """
        self.rl_requests: deque[float] = deque()
        self.rl_allowed_requests: int = allowed_requests
        self.rl_seconds: int = seconds

    def is_allowed(self) -> bool:
        """
        Returns `True` if request can be made without violating rate limit.
        You need to use `.init_rate_limiter()` before using this method.
        """
        current_time = time.time()

        while self.rl_requests and self.rl_requests[0] <= (current_time - self.rl_seconds):
            self.rl_requests.popleft()

        if len(self.rl_requests) < self.rl_allowed_requests:
            self.rl_requests.append(current_time)
            return True
        return False
