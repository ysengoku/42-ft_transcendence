import { socketManager } from './socket';
import { router } from '@router';
import { auth } from '@auth';
import { showToastNotification, TOAST_TYPES, showAlertMessageForDuration, ALERT_TYPE } from '@utils';

// Socket registration for livechat module including Chat, Notifications, and Onlie status
socketManager.addSocket('livechat', {
  new_message: (data) => {
    if (window.location.pathname === '/chat') {
      const customEvent = new CustomEvent('newChatMessage', { detail: data, bubbles: true });
      document.dispatchEvent(customEvent);
    } else {
      const chatButton = document.querySelector('chat-button');
      chatButton?.querySelector('.notification-badge')?.classList.remove('d-none');
      showToastNotification('New message just rode in.', TOAST_TYPES.INFO);
    }
    return;
  },
  like_message: (data) => {
    if (window.location.pathname !== '/chat') {
      return;
    }
    const customEvent = new CustomEvent('toggleLikeChatMessage', {
      detail: { data, is_liked: true },
      bubbles: true,
    });
    document.dispatchEvent(customEvent);
  },
  unlike_message: (data) => {
    if (window.location.pathname !== '/chat') {
      return;
    }
    const customEvent = new CustomEvent('toggleLikeChatMessage', {
      detail: { data, is_liked: false },
      bubbles: true,
    });
    document.dispatchEvent(customEvent);
  },
  game_invite: (data) => {
    const notificationButton = document.querySelector('notifications-button');
    notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
    showToastNotification(`${data.nickname} challenges you to a duel.`, TOAST_TYPES.INFO);
  },
  game_accepted: (data) => {
    if (window.location.pathname === '/duel') {
      const duelPage = document.querySelector('duel-page');
      duelPage?.invitationAccepted(data);
      return;
    }
    const param = {
      status: 'starting',
      gameId: data.game_id,
      username: data.username,
      nickname: data.nickname,
      avatar: data.avatar,
      elo: data.elo,
    };
    showAlertMessageForDuration(ALERT_TYPE.SUCCESS, 'Duel accepted. Redirecting to the Duel page.', 2000);
    setTimeout(() => {
      router.navigate('/duel', param);
    }, 2000);
  },
  game_declined: async (data) => {
    const user = await auth.getStoredUser();
    if (!user) {
      return;
    }
    if (window.location.pathname === '/duel') {
      const duelPage = document.querySelector('duel-page');
      duelPage?.invitationDeclined(data);
      return;
    }
    const nickname = data.username.toLowerCase() === user.username.toLowerCase() ? 'You' : data.nickname;
    showToastNotification(`${nickname} have declined the duel invitation.`, TOAST_TYPES.INFO);
  },
  game_invite_canceled: async (data) => {
    const user = await auth.getStoredUser();
    const duelPageElement = document.querySelector('duel-page');
    const clientId = duelPageElement?.clientId;
    if (!user || !clientId) {
      return;
    }
    const isCurrentTab = data.client_id === clientId;
    let message;
    let type = TOAST_TYPES.INFO;
    switch (isCurrentTab) {
      case true:
        if (window.location.pathname === '/duel') {
          duelPageElement.status = 'canceled';
        }
        if (!data.username) {
          data.message ? (message = data.message) : (message = 'Game invitation has been canceled.');
          type = TOAST_TYPES.ERROR;
        } else if (data.username === user.username) {
          message = 'Your duel invitation has successfully been canceled.';
        }
        break;
      case false:
        if (data.username && data.username === user.username && data.nickname) {
          message = `${data.nickname} canceled the duel invitation.`;
        }
    }
    if (message) {
      showToastNotification(message, type);
    }
  },
  new_tournament: (data) => {
    const notificationButton = document.querySelector('notifications-button');
    notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
    showToastNotification(`${data.alias} is calling all gunslingers to a new tournament.`, TOAST_TYPES.INFO);
    if (window.location.pathname === '/tournament-menu') {
      const element = document.querySelector('tournament-menu');
      element.render();
    }
  },
  new_friend: (data) => {
    const notificationButton = document.querySelector('notifications-button');
    notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
    showToastNotification(`${data.nickname} just roped you in as a friend.`, TOAST_TYPES.INFO);
  },
  user_online: (data) => {
    const customEvent = new CustomEvent('onlineStatus', {
      detail: { data, online: true },
      bubbles: true,
    });
    document.dispatchEvent(customEvent);
  },
  user_offline: (data) => {
    const customEvent = new CustomEvent('onlineStatus', {
      detail: { data, online: false },
      bubbles: true,
    });
    document.dispatchEvent(customEvent);
  },
});
