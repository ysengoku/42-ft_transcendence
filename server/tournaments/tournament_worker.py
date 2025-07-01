import asyncio
from channels.generic.websocket import AsyncConsumer
from tournaments.tournament_service import TournamentService


class TournamentWorkerConsumer(AsyncConsumer):
    async def check_brackets_later(self, event):
        print("function check_brackets_later from tournament worker")
        if event is None or not "tournament_id" in event:
            return
        tournament_id = event["tournament_id"]
        await asyncio.sleep(30)
        await TournamentService.async_check_brackets_status(tournament_id)


async def main():
    consumer = TournamentWorkerConsumer()
    channel_layer = get_channel_layer()
    while True:
        message = await channel_layer.receive("tournament_worker")
        await consumer.check_brackets_later(message)


if __name__ == "__main__":
    asyncio.run(main())
