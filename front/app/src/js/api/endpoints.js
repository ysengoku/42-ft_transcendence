const API_BASE_URL = 'https://localhost:1026/api/'; // For Test environment

export const API_ENDPOINTS = {
  SIGNUP: `${API_BASE_URL}signup`,
  LOGIN: `${API_BASE_URL}login`,
  USERS: `${API_BASE_URL}users`,
  USER_PROFILE: (username) => `${API_BASE_URL}users/${username}`,
  USER_FRIENDS: (username) => `${API_BASE_URL}users/${username}friends`,
  USER_REMOVE_FRIEND: (username, friend) => `${API_BASE_URL}users/${username}/friends/${friend}`,
  USER_BLOCKED_USERS: (username) => `${API_BASE_URL}users/${username}/blocked_users`,
  USER_UNBLOCK_USER: (username, blockedUser) => `${API_BASE_URL}users/${username}/blocked_users/${blockedUser}`,
  // LOGOUT: ,
  OAUTH_AUTHORIZE: (platform) => `${API_BASE_URL}oauth/authorize/${platform}`,
  OAUTH_CALLBACK: (platform) => `${API_BASE_URL}oauth/callback/${platform}`,
  TWOFA_SETUP: `${API_BASE_URL}2fa/setup`,
  TWOFA_VERIFY: `${API_BASE_URL}2fa/verify`,
  TWOFA_SEND: `${API_BASE_URL}2fa/send`,
};
