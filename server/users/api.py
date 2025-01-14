from ninja import NinjaAPI

api = NinjaAPI()


@api.get("add/")
def add(request, a: int, b: int):
    return {"result": a + b}


weapons = ["Ninjato", "Shuriken", "Katana", "Kama", "Kunai", "Naginata", "Yari"]


@api.get("/weapons")
def list_weapons(request, limit: int = 10, offset: int = 0):
    return weapons[offset: offset + limit]

# from django.core.exceptions import ValidationError
#
# @api.exception_handler(ValidationError)
# def django_validation_error(request, exc: ValidationError):
#     return api.create_response(
#         request,
#         {
#             "detail": [
#                 {
#                     "type": "unknown_type",
#                     "loc": ["body", "payload", key],
#                     "msg": exc.message_dict[key],
#                 }
#                 for key in exc.message_dict
#             ]
#         },
#         status=400,
#     )
