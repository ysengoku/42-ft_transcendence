```
front   
├── Dockerfile   
├── app   
│   ├── .eslintrc.json   
│   ├── .gitignore   
│   ├── .prettierrc   
│   ├── __mock__   
│   │   ├── functions   
│   │   │   ├── mockChatListData.js   
│   │   │   ├── mockChatMessages.js   
│   │   │   ├── mockChatMoreMesssages.js   
│   │   │   ├── mockDuelData.js   
│   │   │   ├── mockEloHistory.js   
│   │   │   ├── mockFetchDuelHistory.js   
│   │   │   ├── mockFetchTournamentHistory.js   
│   │   │   ├── mockLogin.js   
│   │   │   ├── mockNotificationsData.js   
│   │   │   ├── mockRegister.js   
│   │   │   ├── simulateFetchFriendsList.js   
│   │   │   ├── simulateFetchUserData.js   
│   │   │   └── simulateFetchUserProfile.js   
│   │   ├── img   
│   │   │   ├── sample-pic1.jpg   
│   │   │   ├── sample-pic2.png   
│   │   │   └── sample-pic3.png   
│   │   ├── svgMock.js   
│   │   └── test_server.py   
│   ├── __tests__   
│   │   └── unit   
│   │       ├── loginInputValidation.test.js   
│   │       └── registerInputValidation.test.js   
│   ├── babel.config.cjs   
│   ├── index.html   
│   ├── jest.config.js   
│   ├── media   
│   ├── package.json   
│   ├── public   
│   │   ├── 3d_models   
│   │   ├── audio   
│   │   ├── filters   
│   │   ├── fonts   
│   │   └── img   
│   ├── src   
│   │   ├── css   
│   │   │   └── style.css   
│   │   ├── js   
│   │   │   ├── api   
│   │   │   │   ├── apiRequest.js   
│   │   │   │   ├── endpoints.js   
│   │   │   │   └── index.js   
│   │   │   ├── auth   
│   │   │   │   ├── authManager.js   
│   │   │   │   ├── csrfToken.js   
│   │   │   │   ├── handleLogout.js   
│   │   │   │   ├── index.js   
│   │   │   │   └── refreshToken.js   
│   │   │   ├── components   
│   │   │   │   ├── navbar   
│   │   │   │   │   ├── Navbar.js   
│   │   │   │   │   ├── components   
│   │   │   │   │   │   ├── ChatButton.js   
│   │   │   │   │   │   ├── DropdownMenu.js   
│   │   │   │   │   │   ├── FriendsButton.js   
│   │   │   │   │   │   ├── FriendsList.js   
│   │   │   │   │   │   ├── NavbarBrand.js   
│   │   │   │   │   │   ├── NotificationsButton.js   
│   │   │   │   │   │   ├── NotificationsList.js   
│   │   │   │   │   │   ├── NotificationsListItem.js   
│   │   │   │   │   │   ├── UserActionsMenu.js   
│   │   │   │   │   │   ├── UserListItem.js   
│   │   │   │   │   │   ├── UserSearch.js   
│   │   │   │   │   │   └── UserSearchButton.js   
│   │   │   │   │   └── index.js   
│   │   │   │   └── pages   
│   │   │   │       ├── Error.js   
│   │   │   │       ├── Landing.js   
│   │   │   │       ├── NotFound.js   
│   │   │   │       ├── chat   
│   │   │   │       │   ├── Chat.js   
│   │   │   │       │   └── components   
│   │   │   │       │       ├── ChatList.js   
│   │   │   │       │       ├── ChatListItem.js   
│   │   │   │       │       ├── ChatMessageArea.js   
│   │   │   │       │       ├── ChatMessageInput.js   
│   │   │   │       │       ├── ChatUserSearch.js   
│   │   │   │       │       ├── ChatUserSearchItem.js   
│   │   │   │       │       └── index.js   
│   │   │   │       ├── game   
│   │   │   │       │   ├── Game.js   
│   │   │   │       │   └── MultiplayerGame.js   
│   │   │   │       ├── home   
│   │   │   │       │   ├── Home.js   
│   │   │   │       │   └── components   
│   │   │   │       │       ├── DuelButton.js   
│   │   │   │       │       ├── LocalGameButton.js   
│   │   │   │       │       ├── LogoutButton.js   
│   │   │   │       │       ├── ProfileButton.js   
│   │   │   │       │       ├── SettingsButton.js   
│   │   │   │       │       ├── TournamentButton.js   
│   │   │   │       │       └── index.js   
│   │   │   │       ├── index.js   
│   │   │   │       ├── login   
│   │   │   │       │   ├── ForgotPassword.js   
│   │   │   │       │   ├── Login.js   
│   │   │   │       │   ├── MfaVerification.js   
│   │   │   │       │   ├── ResetPassword.js   
│   │   │   │       │   └── components   
│   │   │   │       │       ├── LoginForm.js   
│   │   │   │       │       ├── OAuth.js   
│   │   │   │       │       └── index.js   
│   │   │   │       ├── match   
│   │   │   │       │   ├── Duel.js   
│   │   │   │       │   ├── DuelMenu.js   
│   │   │   │       │   ├── DuelResult.js   
│   │   │   │       │   ├── LocalGameMenu.js   
│   │   │   │       │   └── components   
│   │   │   │       │       ├── ConfirmationModal.js   
│   │   │   │       │       ├── DuelPreview.js   
│   │   │   │       │       ├── GameOptions.js   
│   │   │   │       │       ├── GameOptionsModal.js   
│   │   │   │       │       └── index.js   
│   │   │   │       ├── profile   
│   │   │   │       │   ├── Profile.js   
│   │   │   │       │   ├── UserNotFound.js   
│   │   │   │       │   └── components   
│   │   │   │       │       ├── Avatar.js   
│   │   │   │       │       ├── DuelHistory.js   
│   │   │   │       │       ├── EloProgressionChart.js   
│   │   │   │       │       ├── Enemy.js   
│   │   │   │       │       ├── GameHistory.js   
│   │   │   │       │       ├── GameResultModal.js   
│   │   │   │       │       ├── OnlineStatusIndicator.js   
│   │   │   │       │       ├── StatCard.js   
│   │   │   │       │       ├── TournamentHistory.js   
│   │   │   │       │       ├── UserActions.js   
│   │   │   │       │       ├── UserInfo.js   
│   │   │   │       │       ├── WinRatePieGraph.js   
│   │   │   │       │       └── index.js   
│   │   │   │       ├── register   
│   │   │   │       │   └── Register.js   
│   │   │   │       ├── settings   
│   │   │   │       │   ├── AccountDeleted.js   
│   │   │   │       │   ├── Settings.js   
│   │   │   │       │   └── components   
│   │   │   │       │       ├── AvatarUpload.js   
│   │   │   │       │       ├── AvatarUploadModal.js   
│   │   │   │       │       ├── DeleteAccountButton.js   
│   │   │   │       │       ├── DeleteAccountConfirmationModal.js   
│   │   │   │       │       ├── EmailUpdate.js   
│   │   │   │       │       ├── MfaEnableUpdate.js   
│   │   │   │       │       ├── PasswordUpdate.js   
│   │   │   │       │       ├── UserIdentityUpdate.js   
│   │   │   │       │       └── index.js   
│   │   │   │       └── tournament   
│   │   │   │           ├── Tournament.js   
│   │   │   │           ├── TournamentMenu.js   
│   │   │   │           └── TournamentResult.js   
│   │   │   ├── router.js   
│   │   │   ├── socket.js   
│   │   │   ├── theme.js   
│   │   │   └── utils   
│   │   │       ├── ThemeController.js   
│   │   │       ├── alertMessage.js   
│   │   │       ├── animations.js   
│   │   │       ├── dateFormat.js   
│   │   │       ├── formFeedback.js   
│   │   │       ├── index.js   
│   │   │       ├── inputFeedback.js   
│   │   │       ├── sanitizeHtml.js   
│   │   │       ├── toastnotification.js   
│   │   │       └── viewPort.js   
│   │   └── main.js   
│   ├── static   
│   └── vite.config.js   
└── doc   
    ├── ApiRequest.md   
    ├── AuthFlow.md   
    ├── ChatComponent.md   
    ├── Component.md   
    ├── FRONT.md   
    ├── PROJECT_TREE.md   
    ├── Router.md   
    ├── SocketManager.md   
    ├── TESTSERVER.md   
    └── tree.py   
```