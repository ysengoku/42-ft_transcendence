from django.shortcuts import render


def match(request, match_name):
    return render(request, "chat/match.html", {"match_name": match_name})
