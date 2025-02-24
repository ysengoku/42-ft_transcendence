const API_BASE_URL = 'https://localhost:1026/api/'; // For Test environment

export const API_ENDPOINTS = {
  SIGNUP: `${API_BASE_URL}signup`,
  LOGIN: `${API_BASE_URL}login`,
  OAUTH_AUTHORIZE: (platform) => `${API_BASE_URL}oauth/authorize/${platform}`,
  MFA_VERIFICATION: (username) => `${API_BASE_URL}mfa/verify-mfa?username=${username}`,
  MFA_RESEND_CODE: (username) => `${API_BASE_URL}mfa/send-code?username=${username}`,
  REFRESH: `${API_BASE_URL}refresh`,
  LOGOUT: `${API_BASE_URL}logout`,
  SELF: `${API_BASE_URL}self`,
  USER_PROFILE: (username) => `${API_BASE_URL}users/${username}`,
  USER_SETTINGS: (username) => `${API_BASE_URL}users/${username}/settings`,
  USER_FRIENDS: (username) => `${API_BASE_URL}users/${username}/friends`,
  USER_REMOVE_FRIEND: (username, friend) => `${API_BASE_URL}users/${username}/friends/${friend}`,
  USER_BLOCKED_USERS: (username) => `${API_BASE_URL}users/${username}/blocked_users`,
  USER_UNBLOCK_USER: (username, blockedUser) => `${API_BASE_URL}users/${username}/blocked_users/${blockedUser}`,
  OAUTH_AUTHORIZE: (platform) => `${API_BASE_URL}oauth/authorize/${platform}`,
  OAUTH_CALLBACK: (platform) => `${API_BASE_URL}oauth/callback/${platform}`,
  USER_SEARCH: (query, limit, offset) => `${API_BASE_URL}users?search=${query}&limit=${limit}&offset=${offset}`,
  USER_FRIENDS_LIST: (username, limit, offset) => `${API_BASE_URL}users/${username}/friends?limit=${limit}&offset=${offset}`,
};



// curl -X 'POST' \
//   'http://localhost:8000/api/mfa/verify-mfa?username=john' \
//   -H 'accept: application/json' \
//   -H 'Content-Type: application/json' \
//   -H 'X-CSRFToken: Aj4mvulfzyamfhiOdUYNxlNDQKlIbjPyFkHFsk7mJul1LyQA9qJ6Bm8Gvec8q87i' \
//   -d '{
//   "token": "string"
// }'

// curl -X 'POST' \
//   'http://localhost:8000/api/mfa/send-code?username=john' \
//   -H 'accept: application/json' \
//   -H 'X-CSRFToken: Aj4mvulfzyamfhiOdUYNxlNDQKlIbjPyFkHFsk7mJul1LyQA9qJ6Bm8Gvec8q87i' \
//   -d ''
