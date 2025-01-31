const API_BASE_URL = 'https://localhost:1026/api/'; // For Test environment

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}login`,
  USERS: `${API_BASE_URL}users`,
  USER_PROFILE: (username) => `${API_BASE_URL}users/${username}`,
  USER_FRIENDS: (username) => `${API_BASE_URL}users/${username}friends`,
  USER_REMOVE_FRIEND: (username, friend) => `${API_BASE_URL}users/${username}/friends/${friend}`,
  USER_BLOCKED_USERS: (username) => `${API_BASE_URL}users/${username}/blocked_users`,
  USER_UNBLOCK_USER: (username, blockedUser) => `${API_BASE_URL}users/${username}/blocked_users/${blockedUser}`,
  // LOGIN: ,
  // LOGOUT: ,
};
