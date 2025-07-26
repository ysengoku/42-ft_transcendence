import asyncio
import logging

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncConsumer
from channels.layers import get_channel_layer

from tournaments.tournament_service import TournamentService

logger = logging.getLogger("server")


class TournamentWorkerConsumer(AsyncConsumer):
    async def check_brackets_later(self, event):
        logger.debug("function check_brackets_later from tournament worker")
        if event is None or "tournament_id" not in event or "round_number" not in event:
            return
        tournament_id = event["tournament_id"]
        round_number = event["round_number"]
        time_to_wait = 10
        logger.info("The time to wait is actually set to %s", time_to_wait)
        await asyncio.sleep(time_to_wait)
        await TournamentService.async_check_brackets_status(tournament_id, round_number)

    async def tournament_game_finished(self, event):
        logger.debug("function tournament_game_finished from tournament worker")
        if event is None or "tournament_id" not in event or "bracket_id" not in event:
            return
        tournament_id = event["tournament_id"]
        bracket_id = event["bracket_id"]
        await sync_to_async(TournamentService.tournament_game_finished)(
            tournament_id,
            bracket_id,
        )


async def main():
    consumer = TournamentWorkerConsumer()
    channel_layer = get_channel_layer()
    while True:
        message = await channel_layer.receive("tournament")
        await consumer.check_brackets_later(message)


if __name__ == "__main__":
    asyncio.run(main())
