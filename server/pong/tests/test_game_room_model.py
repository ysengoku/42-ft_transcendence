import logging

from django.test import TestCase

from chat.models import GameInvitation
from pong.models import GameRoom, GameRoomPlayer, get_default_game_room_settings
from tournaments.models import Tournament
from users.models import User


class GameRoomModelTests(TestCase):
    def setUp(self):
        self.user1: User = User.objects.create_user("Pedro", email="user1@gmail.com", password="123")
        self.user2: User = User.objects.create_user("Juan", email="user2@gmail.com", password="123")

    def test_handle_game_room_settings_with_empty_arg(self):
        game_room_settings = GameRoom.handle_game_room_settings_types({})
        self.assertEqual(game_room_settings, get_default_game_room_settings(), 'Empty dict should be evaluated to '
                         'default game room settings')

    def test_handle_game_room_settings_with_arg_with_non_specified_fields(self):
        game_room_settings = GameRoom.handle_game_room_settings_types({'time_limit': '3', 'game_speed': 'fast'})
        should_be_equal = get_default_game_room_settings()
        should_be_equal['time_limit'] = 3
        should_be_equal['game_speed'] = 'fast'
        self.assertEqual(game_room_settings, should_be_equal, 'Empty field of the dict should be evaluated to defaults')

        game_room_settings = GameRoom.handle_game_room_settings_types({'cool_mode': 'True', 'ranked': 'True', 'score_to_win': '7'})
        should_be_equal = get_default_game_room_settings()
        should_be_equal['cool_mode'] = True
        should_be_equal['ranked'] = True
        should_be_equal['score_to_win'] = 7
        self.assertEqual(game_room_settings, should_be_equal, 'Empty field of the dict should be evaluated to defaults')

    def test_handle_game_room_settings_with_empty_field_should_give_default(self):
        game_room_settings = GameRoom.handle_game_room_settings_types({'time_limit': '3', 'game_speed': 'fast'})
        should_be_equal = get_default_game_room_settings()
        should_be_equal['time_limit'] = 3
        should_be_equal['game_speed'] = 'fast'
        self.assertEqual(game_room_settings, should_be_equal, 'Empty field of the dict should be evaluated to defaults')

    def test_handle_game_room_settings_with_false_ranked(self):
        game_room_settings = GameRoom.handle_game_room_settings_types({'ranked': 'False', 'cool_mode': 'false'})
        should_be_equal = get_default_game_room_settings()
        should_be_equal['ranked'] = False
        should_be_equal['cool_mode'] = False
        self.assertEqual(game_room_settings, should_be_equal, 'False and false values on ranked and cool mode should'
                         'be evaluated to False')

        game_room_settings = GameRoom.handle_game_room_settings_types({'ranked': '123', 'cool_mode': 'true'})
        should_be_equal = get_default_game_room_settings()
        should_be_equal['ranked'] = True
        should_be_equal['cool_mode'] = True
        self.assertEqual(game_room_settings, should_be_equal, 'Any value other than False or false string on ranked '
                         'and cool mode should be evaluated to True')

    def test_handle_game_room_settings_with_incorrect_fields(self):
        self.assertIsNone(GameRoom.handle_game_room_settings_types({'time_limit': '0'}), 'Time limit in parsed settings should be between 1 and 5')
        self.assertIsNone(GameRoom.handle_game_room_settings_types({'time_limit': '6'}), 'Time limit in parsed settings should be between 1 and 5')

        self.assertIsNone(GameRoom.handle_game_room_settings_types({'score_to_win': '2'}), 'Score to win in parsed settings should be between 3 and 20')
        self.assertIsNone(GameRoom.handle_game_room_settings_types({'score_to_win': '21'}), 'Score to win in parsed settings should be between 3 and 20')

        self.assertIsNone(GameRoom.handle_game_room_settings_types({'game_speed': 'asd'}), 'Game speed in parsed settings should be "fast", "medium" or "slow"')

    def test_for_settings_finding_correct_games(self):
        gr1 = GameRoom.objects.create()
        gr2 = GameRoom.objects.create(settings={})
        gr3 = GameRoom.objects.create(settings={'game_speed': 'fast', 'score_to_win': 7})
        gr4 = GameRoom.objects.create(settings={'game_speed': 'fast', 'time_limit': 4})
        gr5 = GameRoom.objects.create(settings={'game_speed': 'slow', 'time_limit': 4})
        gr6 = GameRoom.objects.create(settings={'time_limit': 5, 'score_to_win': 6})
        gr7 = GameRoom.objects.create(settings={'ranked': True, 'cool_mode': True, 'score_to_win': 7})
        gr8 = GameRoom.objects.create(settings={'ranked': True, 'cool_mode': False, 'score_to_win': 7})

        q1 = list(GameRoom.objects.for_settings({}))
        self.assertTrue(gr1 in q1 and
                        gr2 in q1 and
                        gr3 in q1 and
                        gr4 in q1 and
                        gr5 in q1 and
                        gr6 in q1 and
                        gr7 in q1 and
                        gr8 in q1, 'All settings should find empty settings')

        q2 = list(GameRoom.objects.for_settings({'game_speed': 'fast'}))
        self.assertTrue(gr1 not in q2 and
                        gr2 in q2 and
                        gr3 in q2 and
                        gr4 in q2 and
                        gr5 not in q2 and
                        gr6 in q2 and
                        gr7 in q2 and
                        gr8 in q2, '')

        q3 = list(GameRoom.objects.for_settings({'game_speed': 'fast', 'time_limit': 4}))
        self.assertTrue(gr1 not in q3 and
                        gr2 in q3 and
                        gr3 in q3 and
                        gr4 in q3 and
                        gr5 not in q3 and
                        gr6 not in q3 and
                        gr7 in q3 and
                        gr8 in q3, '')

        q4 = list(GameRoom.objects.for_settings({'game_speed': 'fast', 'time_limit': 4, 'cool_mode': True}))
        self.assertTrue(gr1 not in q4 and
                        gr2 in q4 and
                        gr3 in q4 and
                        gr4 in q4 and
                        gr5 not in q4 and
                        gr6 not in q4 and
                        gr7 in q4 and
                        gr8 not in q4, '')

        q5 = list(GameRoom.objects.for_settings({'game_speed': 'slow', 'ranked': True}))
        self.assertTrue(gr1 not in q5 and
                        gr2 in q5 and
                        gr3 not in q5 and
                        gr4 not in q5 and
                        gr5 in q5 and
                        gr6 in q5 and
                        gr7 in q5 and
                        gr8 in q5, '')



    def test_is_in_tournament_when_it_is_not_in_tournament(self):
        game_room: GameRoom = GameRoom.objects.create()
        game_room.add_player(self.user1.profile)
        game_room.add_player(self.user2.profile)
        self.assertEqual(
            game_room.is_in_tournament(),
            False,
            ".is_in_tournament() should give False when it's not tied to any Bracket"
        )

    # def test_is_in_tournament_when_it_is_in_tournament(self):
    #     game_room: GameRoom = GameRoom.objects.create()
    #     game_room.add_player(self.user1.profile)
    #     game_room.add_player(self.user2.profile)
    #     self.assertEqual(
    #         game_room.is_in_tournament(),
    #         True,
    #         "idk how to test it yet lol"
    #     )
