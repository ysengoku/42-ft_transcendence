from django.shortcuts import render


def match(request, match_name):
    return render(request, "pong/match.html", {"match_name": match_name})
