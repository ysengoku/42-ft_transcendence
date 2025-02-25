from ninja import Schema


class MessageSchema(Schema):
    """
    Generic response from the server with user-friendly message.
    """

    msg: str
