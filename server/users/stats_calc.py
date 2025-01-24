def calculate_winrate(wins: int, loses: int) -> int | None:
    total = wins + loses
    if total == 0:
        return None
    return round(wins / (total) * 100)


def calculate_expected_score(a: int, b: int) -> float:
    """
    Calculates probability of player with rating a winning against player with rating b.
    The result is a number between 0 and 1. Rounded to 2 digis for clarity.
    """
    return round(1 / (1 + 10 ** ((b - a) / 400)), 2)


def calculate_elo_change(a: int, b: int, outcome: float, k_factor: int = 32) -> int:
    """
    Calculates the elo diff betwenn players with rating a and rating b, given the outcome.
    Outcome can be 1, 0.5 or 0, which are win, draw or loss for player a.
    """
    expected_score = calculate_expected_score(a, b)

    return round(k_factor * (outcome - expected_score))

