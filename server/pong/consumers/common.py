
class PongCloseCodes:
    """
    Shared enum between different consumers for definition the unified close codes.
    Normal closure     -> the process was finished normally.
    Cancelled          -> the process was canceled.
    Illegal connection -> someone not authorized tried to connect.
    Bad data           -> server received ill-formed data.
    """

    NORMAL_CLOSURE = 3000
    CANCELLED = 3001
    ILLEGAL_CONNECTION = 3002
    BAD_DATA = 3100
