const API_BASE_URL = `https://${location.host}/api/`; // For Test environment
const API_USERS = 'users';
const API_CHAT = 'chats';
const API_GAME_STATS = 'game-stats';

export const API_ENDPOINTS = {
  SIGNUP: `${API_BASE_URL}signup`,
  LOGIN: `${API_BASE_URL}login`,
  OAUTH_AUTHORIZE: (platform) => `${API_BASE_URL}oauth/authorize/${platform}`,
  MFA_VERIFICATION: (username) => `${API_BASE_URL}mfa/verify-mfa?username=${username}`,
  MFA_RESEND_CODE: (username) => `${API_BASE_URL}mfa/resend-code?username=${username}`,
  REFRESH: `${API_BASE_URL}refresh`,
  SELF: `${API_BASE_URL}self`,
  LOGOUT: `${API_BASE_URL}logout`,
  FORGOT_PASSWORD: `${API_BASE_URL}forgot-password`,
  RESET_PASSWORD: (token) => `${API_BASE_URL}reset-password/${token}`,
  USER_PROFILE: (username) => `${API_BASE_URL}${API_USERS}/${username}`,
  USER_SETTINGS: (username) => `${API_BASE_URL}${API_USERS}/${username}/settings`,
  USER_DELETE: (username) => `${API_BASE_URL}${API_USERS}/${username}/delete`,
  USER_FRIENDS: (username) => `${API_BASE_URL}${API_USERS}/${username}/friends`,
  USER_REMOVE_FRIEND: (username, friend) => `${API_BASE_URL}${API_USERS}/${username}/friends/${friend}`,
  USER_BLOCKED_USERS: (username) => `${API_BASE_URL}${API_USERS}/${username}/blocked_users`,
  USER_UNBLOCK_USER: (username, blockedUser) => `${API_BASE_URL}${API_USERS}/${username}/blocked_users/${blockedUser}`,
  USER_SEARCH: (query, limit, offset) => `${API_BASE_URL}${API_USERS}?search=${query}&limit=${limit}&offset=${offset}`,
  USER_FRIENDS_LIST: (username, limit, offset) =>
    `${API_BASE_URL}${API_USERS}/${username}/friends?limit=${limit}&offset=${offset}`,
  CHAT_LIST: (limit, offset) => `${API_BASE_URL}${API_CHAT}?&limit=${limit}&offset=${offset}`,
  CHAT: (username) => `${API_BASE_URL}${API_CHAT}/${username}`,
  CHAT_MESSAGES: (username, limit, offset) => `${API_BASE_URL}${API_CHAT}/${username}/messages?limit=${limit}&offset=${offset}`,
  NOTIFICATIONS: (isread, limit, offset) => `${API_BASE_URL}notifications?is_read=${isread}&limit=${limit}&offset=${offset}`,
  DAILY_ELO: (username, limit, offset) => `${API_BASE_URL}${API_GAME_STATS}/${username}/daily-elo?limit=${limit}&offset=${offset}`,
  MATCHES: (username, limit, offset) => `${API_BASE_URL}${API_GAME_STATS}/${username}/matches?limit=${limit}&offset=${offset}`,
  MATCH_RESULT: (id) => `${API_BASE_URL}${API_GAME_STATS}/matches/${id}`,
};
