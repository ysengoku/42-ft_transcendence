const API_BASE_URL = 'https://localhost:1026/api/'; // For Test environment

export const API_ENDPOINTS = {
  SIGNUP: `${API_BASE_URL}signup`,
  LOGIN: `${API_BASE_URL}login`,
  OAUTH_AUTHORIZE: (platform) => `${API_BASE_URL}oauth/authorize/${platform}`,
  MFA_VERIFICATION: `${API_BASE_URL}mfa/verify-mfa`,
  MFA_RESEND_CODE: `${API_BASE_URL}mfa/send-code`,
  REFRESH: `${API_BASE_URL}refresh`,
  LOGOUT: `${API_BASE_URL}logout`,
  SELF: `${API_BASE_URL}self`,
  USER_PROFILE: (username) => `${API_BASE_URL}users/${username}`,
  USER_SETTINGS: (username) => `${API_BASE_URL}users/${username}/settings`,
  USER_FRIENDS: (username) => `${API_BASE_URL}users/${username}/friends`,
  USER_REMOVE_FRIEND: (username, friend) => `${API_BASE_URL}users/${username}/friends/${friend}`,
  USER_BLOCKED_USERS: (username) => `${API_BASE_URL}users/${username}/blocked_users`,
  USER_UNBLOCK_USER: (username, blockedUser) => `${API_BASE_URL}users/${username}/blocked_users/${blockedUser}`,
  USER_SEARCH: (query, limit, offset) => `${API_BASE_URL}users?search=${query}&limit=${limit}&offset=${offset}`,
  USER_FRIENDS_LIST: (username, limit, offset) => `${API_BASE_URL}users/${username}/friends?limit=${limit}&offset=${offset}`,
};
