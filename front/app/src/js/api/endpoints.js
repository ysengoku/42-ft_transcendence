const API_BASE_URL = 'http://localhost:8000/api'; // For Test environment

export const API_ENDPOINTS = {
  USERS: `${API_BASE_URL}/users/`,
  USER_PROFILE: (username) => `${API_BASE_URL}/users/${username}`,
  // POST_USER_AVATAR:,
  // LOGIN: ,
  // LOGOUT: ,
};
