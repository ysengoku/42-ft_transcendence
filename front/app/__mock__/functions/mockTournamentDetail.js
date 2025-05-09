export async function mockTournamentDetail(status) {
  const data = {
	finished: {
      id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      name: "Spring Championship",
      status: "finished",
      creator: {
        username: "admin",
        nickname: "Admin",
        avatar: '/__mock__/img/sample-pic3.png',
        elo: 2000,
        is_online: true
      },
      winner: {
        user: {
        username: "user1",
        nickname: "Player One",
        avatar: '/__mock__/img/sample-pic3.png',
        elo: 1500,
        is_online: false
        },
        "alias": "Player One",
        "status": "won",
        "round": 3
      },
      "date": "2025-05-09T11:43:42.045Z",
      "rounds": [
        {
        "number": 1,
        "status": "finished",
        "brackets": [
          {
          "game_id": "game1",
          "participant1": {

            "user": {
            "username": "user1",
            "nickname": "Player One",
            "avatar": '/__mock__/img/sample-pic3.png',
            "elo": 1500,
            "is_online": false
            },
            "alias": "Player One",
            "status": "won",
            "round": 1
          },
          "participant2": {
            "username": "user2",
            "nickname": "Player Two",
            "avatar": '/__mock__/img/sample-pic3.png',
            "elo": 1400,
            "is_online": true
          },
          "winner": {
            "username": "user1",
            "nickname": "Player One",
            "avatar": '/__mock__/img/sample-pic3.png',
            "elo": 1500,
            "is_online": false
          },
          "round": 1,
          "status": "finished",
          "score_p1": 2,
          "score_p2": 0
          },
          {
          "game_id": "game2",
          "participant1": {
            "username": "user3",
            "nickname": "Player Three",
            "avatar": '/__mock__/img/sample-pic3.png',
            "elo": 1450,
            "is_online": true
          },
          "participant2": {
            "username": "user4",
            "nickname": "Player Four",
            "avatar": '/__mock__/img/sample-pic3.png',
            "elo": 1300,
            "is_online": false
          },
          "winner": {
            "username": "user3",
            "nickname": "Player Three",
            "avatar": '/__mock__/img/sample-pic3.png',
            "elo": 1450,
            "is_online": true
          },
          "round": 1,
          "status": "finished",
          "score_p1": 2,
          "score_p2": 1
          },
          {
          "game_id": "game3",
          "participant1": {
            "username": "user5",
            "nickname": "Player Five",
            "avatar": '/__mock__/img/sample-pic3.png',
            "elo": 1350,
            "is_online": true
          },
          "participant2": {
            "username": "user6",
            "nickname": "Player Six",
            "avatar": '/__mock__/img/sample-pic3.png',
            "elo": 1200,
            "is_online": true
          },
          "winner": {
            "username": "user5",
            "nickname": "Player Five",
            "avatar": '/__mock__/img/sample-pic3.png',
            "elo": 1350,
            "is_online": true
          },
          "round": 1,
          "status": "finished",
          "score_p1": 2,
          "score_p2": 1
          },
          {
          "game_id": "game4",
          "participant1": {
            "username": "user7",
            "nickname": "Player Seven",
            "avatar": '/__mock__/img/sample-pic3.png',
            "elo": 1250,
            "is_online": true
          },
          "participant2": {
            "username": "user8",
            "nickname": "Player Eight",
            "avatar": '/__mock__/img/sample-pic3.png',
            "elo": 1100,
            "is_online": false
          },
          "winner": {
            "username": "user7",
            "nickname": "Player Seven",
            "avatar": '/__mock__/img/sample-pic3.png',
            "elo": 1250,
            "is_online": true
          },
          "round": 1,
          "status": "finished",
          "score_p1": 2,
          "score_p2": 0
          }
        ]
        },
        {
        "number": 2,
        "status": "finished",
        "brackets": [
          {
          "game_id": "game5",
          "participant1": {
            "username": "user1",
            "nickname": "Player One",
            "avatar": '/__mock__/img/sample-pic3.png',
            "elo": 1500,
            "is_online": false
          },
          "participant2": {
            "username": "user3",
            "nickname": "Player Three",
            "avatar": '/__mock__/img/sample-pic3.png',
            "elo": 1450,
            "is_online": true
          },
          "winner": {
            "username": "user1",
            "nickname": "Player One",
            "avatar": '/__mock__/img/sample-pic3.png',
            "elo": 1500,
            "is_online": false
          },
          "round": 2,
          "status": "finished",
          "score_p1": 2,
          "score_p2": 1
          },
          {
          "game_id": "game6",
          "participant1": {
            "username": "user5",
            "nickname": "Player Five",
            "avatar": '/__mock__/img/sample-pic3.png',
            "elo": 1350,
            "is_online": true
          },
          "participant2": {
            "username": "user7",
            "nickname": "Player Seven",
            "avatar": '/__mock__/img/sample-pic3.png',
            "elo": 1250,
            "is_online": true
          },
          "winner": {
            "username": "user5",
            "nickname": "Player Five",
            "avatar": '/__mock__/img/sample-pic3.png',
            "elo": 1350,
            "is_online": true
          },
          "round": 2,
          "status": "finished",
          "score_p1": 2,
          "score_p2": 0
          }
        ]
        },
        {
        "number": 3,
        "status": "finished",
        "brackets": [
          {
          "game_id": "final",
          "participant1": {
            "username": "user1",
            "nickname": "Player One",
            "avatar": '/__mock__/img/sample-pic3.png',
            "elo": 1500,
            "is_online": false
          },
          "participant2": {
            "username": "user5",
            "nickname": "Player Five",
            "avatar": '/__mock__/img/sample-pic3.png',
            "elo": 1350,
            "is_online": true
          },
          "winner": {
            "username": "user1",
            "nickname": "Player One",
            "avatar": '/__mock__/img/sample-pic3.png',
            "elo": 1500,
            "is_online": false
          },
          "round": 3,
          "status": "finished",
          "score_p1": 2,
          "score_p2": 1
          }
        ]
        }
      ],
      "participants": [
        { "user": { "username": "user1", "nickname": "Player One", "avatar": '/__mock__/img/sample-pic3.png', "elo": 1500, "is_online": false }, "alias": "Player One", "status": "active", "round": 3 },
        { "user": { "username": "user2", "nickname": "Player Two", "avatar": '/__mock__/img/sample-pic3.png', "elo": 1400, "is_online": true }, "alias": "Player Two", "status": "eliminated", "round": 1 },
        { "user": { "username": "user3", "nickname": "Player Three", "avatar": '/__mock__/img/sample-pic3.png', "elo": 1450, "is_online": true }, "alias": "Player Three", "status": "eliminated", "round": 2 },
        { "user": { "username": "user4", "nickname": "Player Four", "avatar": '/__mock__/img/sample-pic3.png', "elo": 1300, "is_online": false }, "alias": "Player Four", "status": "eliminated", "round": 1 },
        { "user": { "username": "user5", "nickname": "Player Five", "avatar": '/__mock__/img/sample-pic3.png', "elo": 1350, "is_online": true }, "alias": "Player Five", "status": "eliminated", "round": 3 },
        { "user": { "username": "user6", "nickname": "Player Six", "avatar": '/__mock__/img/sample-pic3.png', "elo": 1200, "is_online": true }, "alias": "Player Six", "status": "eliminated", "round": 1 },
        { "user": { "username": "user7", "nickname": "Player Seven", "avatar": '/__mock__/img/sample-pic3.png', "elo": 1250, "is_online": true }, "alias": "Player Seven", "status": "eliminated", "round": 2 },
        { "user": { "username": "user8", "nickname": "Player Eight", "avatar": '/__mock__/img/sample-pic3.png', "elo": 1100, "is_online": false }, "alias": "Player Eight", "status": "eliminated", "round": 1 }
      ],
      "required_participants": 8
      }, 
	};

	return data[status];
}
