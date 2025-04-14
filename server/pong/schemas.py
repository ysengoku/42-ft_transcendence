from datetime import date

from ninja import Field, Schema


class EloDataPointSchema(Schema):
    """
    Represents a single point of gained/lost elo on a particular day.
    """

    day: date
    daily_elo_change: int = Field(description="How much elo user gained or lost on this day.")
    elo_result: int = Field(description="Resulting elo of the user at the end of the day.")
