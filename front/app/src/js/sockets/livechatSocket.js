import { socketManager } from './socket';
import { auth } from '@auth';
import { showToastNotification, TOAST_TYPES } from '@utils';

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
    if (window.location.pathname !== '/chat' || !data || !('is_liked' in data)) {
      return;
    }
    const customEvent = new CustomEvent('toggleLikeChatMessage', {
      detail: data,
      bubbles: true,
    });
    document.dispatchEvent(customEvent);
  },
  game_invite: (data) => {
    showToastNotification(`${data.nickname} challenges you to a duel.`, TOAST_TYPES.NOTIFICATION);
    const notificationButton = document.querySelector('notifications-button');
    notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
  },
  game_accepted: async (data) => {
    const customEvent = new CustomEvent('duelInvitationAccepted', {
      detail: data,
      bubbles: true,
    });
    document.dispatchEvent(customEvent);
  },
  game_declined: async (data) => {
    const user = await auth.getUser();
    if (!user) {
      return;
    }
    if (window.location.pathname === '/duel') {
      const duelPage = document.querySelector('duel-page');
      if (duelPage?.status === 'inviting') {
        duelPage?.invitationDeclined(data);
        return;
      }
    }
    const nickname = data.username.toLowerCase() === user.username.toLowerCase() ? 'You' : data.nickname;
    showToastNotification(`${nickname} have declined the duel invitation.`, TOAST_TYPES.INFO);
  },
  game_invite_canceled: async (data) => {
    const user = await auth.getUser();
    if (!user) {
      return;
    }
    let message = '';
    if (data.username && data.username.toLowerCase() === user.username.toLowerCase()) {
      message = 'You have canceled the duel invitation.';
    } else {
      message = data.message;
    }
    if (message) {
      showToastNotification(message, TOAST_TYPES.INFO);
    }
    if (window.location.pathname === '/duel') {
      const duelPage = document.querySelector('duel-page');
      if (duelPage?.status === 'inviting') {
        duelPage?.invitationCanceled(data);
        return;
      }
    }
  },
  new_tournament: (data) => {
    const notificationButton = document.querySelector('notifications-button');
    notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
    showToastNotification(`${data.alias} is calling all gunslingers to a new tournament.`, TOAST_TYPES.NOTIFICATION);
    if (window.location.pathname === '/tournament-menu') {
      const element = document.querySelector('tournament-menu');
      element.render();
    }
  },
  new_friend: (data) => {
    const notificationButton = document.querySelector('notifications-button');
    notificationButton?.querySelector('.notification-badge')?.classList.remove('d-none');
    showToastNotification(`${data.nickname} just roped you in as a friend.`, TOAST_TYPES.NOTIFICATION);
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
