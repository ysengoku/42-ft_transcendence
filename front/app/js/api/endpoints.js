const API_BASE_URL = 'http://localhost:8000/api';  // For Test environment

export const API_ENDPOINTS = {
    REGISTER: `${API_BASE_URL}/users/`,
    GET_USER_DATA: (username) => `${API_BASE_URL}/users/${username}`,
    // POST_USER_AVATAR: `${API_BASE_URL}/users/avatar/upload`,
    // LOGIN: `${API_BASE_URL}/auth/login`,
    // LOGOUT: `${API_BASE_URL}/auth/logout`,
};
