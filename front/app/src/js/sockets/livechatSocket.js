import { router } from '@router';
import { auth } from '@auth';
import { socketManager } from './socket';
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
      showToastNotification('New message just rode in.');
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
    showToastNotification(`${data.nickname} challenges you to a duel.`);
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
    const authStatus = await auth.fetchAuthStatus();
    if (!authStatus.success) {
      return;
    }
    if (window.location.pathname === '/duel') {
      const duelPage = document.querySelector('duel-page');
      duelPage?.invitationDeclined(data);
      return;
    }
    const nickname = data.username.toLowerCase() === authStatus.response.username.toLowerCase() ? 'You' : data.nickname;
    showToastNotification(`${nickname} have declined the duel invitation.`);
  },
  game_invite_canceled: async (data) => {
    const authStatus = await auth.fetchAuthStatus();
    if (!authStatus.success) {
      return;
    }
    if (window.location.pathname === '/duel') {
      const duelPage = document.querySelector('duel-page');
      duelPage.status = 'canceled';
    }
    if (!data.username && data.message) {
      showToastNotification(data.message, TOAST_TYPES.ERROR);
      return;
    }
    const nickname = data.username.toLowerCase() === authStatus.response.username.toLowerCase() ? 'You' : data.nickname;
    const notificationButton = document.querySelector('notifications-button');
    showToastNotification(`${nickname} have cancelled the duel invitation.`);
    notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
  },
  new_tournament: (data) => {
    const notificationButton = document.querySelector('notifications-button');
    notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
    showToastNotification(`${data.nickname} is calling all gunslingers to a new tournament.`);
    if (window.location.pathname === '/tournament-menu') {
      const element = document.querySelector('tournament-menu');
      element.render();
    }
  },
  new_friend: (data) => {
    const notificationButton = document.querySelector('notifications-button');
    notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
    showToastNotification(`${data.nickname} just roped you in as a friend.`);
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
