class CloseCodes:
    """
    Shared enum between different consumers for definition the unified close codes.
    Normal closure     -> connection did its task normally and closed normally.
    Cancelled          -> connection was canceled by the server.
    Illegal connection -> user who is not authorized tried to connect.
    Bad data           -> server received ill-formed data.
    """

    NORMAL_CLOSURE = 3000
    CANCELLED = 3001
    ILLEGAL_CONNECTION = 3002
    ALREADY_IN_GAME = 3003
    BAD_DATA = 3100
    UNKNOWN_ROUTE = 4000
