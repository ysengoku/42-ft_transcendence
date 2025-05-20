/**
 * Base URL for API endpoints, dynamically based on current host.
 * */
const API_BASE_URL = `https://${location.host}/api/`;

// API sub-resources
const API_USERS = 'users';
const API_CHAT = 'chats';
const API_NOTIFICATIONS = 'notifications';
const API_GAME_STATS = 'game-stats';
const API_TOURNAMENTS = 'tournaments';

/**
 * API_ENDPOINTS
 * Contains all available API endpoints for user management, chat, notifications, and game statistics.
 * Each key maps to a string or a function returning a full API URL.
 * */
export const API_ENDPOINTS = {
  /** POST: Create a new user account */
  SIGNUP: `${API_BASE_URL}signup`,

  /** POST: Login to the user account */
  LOGIN: `${API_BASE_URL}login`,
  OAUTH_AUTHORIZE: (platform) => `${API_BASE_URL}oauth/authorize/${platform}`,
  MFA_VERIFICATION: (username) => `${API_BASE_URL}mfa/verify-mfa?username=${username}`,
  MFA_RESEND_CODE: (username) => `${API_BASE_URL}mfa/resend-code?username=${username}`,

  /** POST: Rotate the refresh token. Issues a new refresh token and a new access token. */
  REFRESH: `${API_BASE_URL}refresh`,

  /** GET: Check authentication status of the user */
  SELF: `${API_BASE_URL}self`,

  /** DELETE: Log out the user. */
  LOGOUT: `${API_BASE_URL}logout`,

  /** POST: Send a password reset email */
  FORGOT_PASSWORD: `${API_BASE_URL}forgot-password`,

  /**
   * POST: Reset the password using a token
   * @param {string} token - The reset token used to verify the password reset request.
   * @return {string} The full API URL for resetting the password.
   * */
  RESET_PASSWORD: (token) => `${API_BASE_URL}reset-password/${token}`,

  /**
   * GET: Gets a specific user by username
   * @param {string} username - The username of the user to retrieve.
   * @return {string} The full API URL for the user.
   * */
  USER_PROFILE: (username) => `${API_BASE_URL}${API_USERS}/${username}`,

  /**
   * GET: Get the current user's information
   * POST: Update the current user's information
   * @param {string} username - The username of the user to retrieve.
   * @return {string} The full API URL for the user profile.
   * */
  USER_SETTINGS: (username) => `${API_BASE_URL}${API_USERS}/${username}/settings`,

  /**
   * DELETE: Delete definitely the user account.
   * @param {string} username - The username of the user to delete.
   * @return {string} The full API URL for deleting the user account.
   * */
  USER_DELETE: (username) => `${API_BASE_URL}${API_USERS}/${username}/delete`,

  /**
   * GET: Get the current user's friends
   * @param {string} username - The username of the user to retrieve.
   * @param {number} limit - The maximum number of friends to return.
   * @param {number} offset - The offset for pagination.
   * @return {string} The full API URL for the user's friends.
   * */
  USER_FRIENDS_LIST: (username, limit, offset) =>
    `${API_BASE_URL}${API_USERS}/${username}/friends?limit=${limit}&offset=${offset}`,

  /**
   * POST: Add a friend to the current user
   * @param {string} username - The username of the user to retrieve.
   * @return {string} The full API URL for the user's friends.
   * @description Username of the user to add as a friend should be passed in the body of the request.
   * */
  USER_FRIENDS: (username) => `${API_BASE_URL}${API_USERS}/${username}/friends`,

  /**
   * DELETE: Remove a friend from the current user
   * @param {string} username - The username of the user to retrieve.
   * @param {string} friend - The friend's username to remove.
   * @return {string} The full API URL for removing a friend.
   * */
  USER_REMOVE_FRIEND: (username, friend) => `${API_BASE_URL}${API_USERS}/${username}/friends/${friend}`,

  /**
   * GET: Get the current user's blocked users
   * POST: Block a user for the current user
   * @param {string} username - The username of the user to retrieve.
   * @return {string} The full API URL for the user's blocked users.
   * */
  USER_BLOCKED_USERS: (username) => `${API_BASE_URL}${API_USERS}/${username}/blocked_users`,

  /**
   * DELETE: Unblock a user for the current user
   * @param {string} username - The username of the user to retrieve.
   * @param {string} blockedUser - The blocked user's username to unblock.
   * @return {string} The full API URL for unblocking a user.
   * */
  USER_UNBLOCK_USER: (username, blockedUser) => `${API_BASE_URL}${API_USERS}/${username}/blocked_users/${blockedUser}`,

  /**
   * GET: Get the user filtered by the search query
   * @param {string} query - The search query to filter users.
   * @param {number} limit - The maximum number of users to return.
   * @param {number} offset - The offset for pagination.
   * @return {string} The full API URL for searching users.
   * */
  USER_SEARCH: (query, limit, offset) => `${API_BASE_URL}${API_USERS}?search=${query}&limit=${limit}&offset=${offset}`,

  /**
   * GET: Get the current user's friends requests
   * @param {number} limit - The maximum number of friends requests to return.
   * @param {number} offset - The offset for pagination.
   * @return {string} The full API URL for the user's friends requests.
   * */
  CHAT_LIST: (limit, offset) => `${API_BASE_URL}${API_CHAT}?&limit=${limit}&offset=${offset}`,

  /**
   * PUT: Get a chat with specific user and first 30 messages. If the chat doesn't exist yet, creates it.
   * @param {string} username - The username of the user to retrieve.
   * @return {string} The full API URL for the chat.
   * */
  CHAT: (username) => `${API_BASE_URL}${API_CHAT}/${username}`,

  /**
   * GET: Gets messages of a specific chat. Paginated by the limit and offset settings
   * @param {string} username - The username of the user to retrieve messages from.
   * @param {number} limit - The maximum number of messages to return.
   * @param {number} offset - The offset for pagination.
   * @return {string} The full API URL for the chat messages.
   */
  CHAT_MESSAGES: (username, limit, offset) => `${API_BASE_URL}${API_CHAT}/${username}/messages?limit=${limit}&offset=${offset}`,

  /**
   * GET: Gets notifications of the user who is currently logged in. Paginated by the limit and offset settings.
   * @param {boolean} isread - The read status of the notifications.
   * @param {number} limit - The maximum number of notifications to return.
   * @param {number} offset - The offset for pagination.
   * @return {string} The full API URL for the user's notifications.
   */
  NOTIFICATIONS: (isread, limit, offset) => `${API_BASE_URL}${API_NOTIFICATIONS}?is_read=${isread}&limit=${limit}&offset=${offset}`,

  /**
   * POST: Marks all notifications as read.
   * @return {string} The full API URL for marking notifications as read.
   */
  NOTIDICATIONS_READ: `${API_BASE_URL}${API_NOTIFICATIONS}/mark_all_as_read`,

  /**
  * GET: Gets daily elo change statistics for a specific user in the form of overall elo gained across last days.
  * Paginated by the limit and offset settings.
  * @param {string} username - The username of the user to retrieve daily elo statistics for.
  * @param {number} limit - The maximum number of daily elo statistics to return.
  * @param {number} offset - The offset for pagination.
  * @return {string} The full API URL for the user's daily elo statistics.
  */
  DAILY_ELO: (username, limit, offset) => `${API_BASE_URL}${API_GAME_STATS}/${username}/daily-elo?limit=${limit}&offset=${offset}`,


  /**
   * GET: Gets match history of a specific user. Paginated by the limit and offset settings.
   * @param {string} username - The username of the user to retrieve match history for.
   * @param {string} order - The order of the matches (asc = from the oldest or desc = from the latest).
   * @param {string} result - The result of the matches (all, lost, or won).
   * @param {number} limit - The maximum number of matches to return.
   * @param {number} offset - The offset for pagination.
   * @return {string} The full API URL for the user's match history.
   * @description
   * */
  MATCHES: (username, order, result, limit, offset) => `${API_BASE_URL}${API_GAME_STATS}/${username}/matches?order=${order}&result=${result}&limit=${limit}&offset=${offset}`,

  /**
   * GET: Gets full stats of a specific match by its id.
   * @param {string} id - The id of the match to retrieve.
   * @return {string} The full API URL for the match stats.
   * */
  MATCH_RESULT: (id) => `${API_BASE_URL}${API_GAME_STATS}/matches/${id}`,

  /**
   * POST: Creates a new tournament.
   * @return {string} The full API URL for creating a new tournament.
   * */
  NEW_TOURNAMENT: `${API_BASE_URL}${API_TOURNAMENTS}`,

  /**
   * GET: Gets a specific tournament by id. Paginated by the limit and offset settings.
   * @return {string} The full API URL for the tournaments list.
   * */
  TOURNAMENT: (id) => `${API_BASE_URL}${API_TOURNAMENTS}/${id}`,
};
