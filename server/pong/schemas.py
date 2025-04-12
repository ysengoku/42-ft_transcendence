from datetime import date

from ninja import Schema


class DayEloChangeSchema(Schema):
    """
    Represents overall elo gained or lost on a particular day.
    """

    day: date
    daily_elo_change: int
    elo_result: int
