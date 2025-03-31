import { router } from '@router';
import { auth, getCSRFTokenfromCookies, refreshAccessToken } from '@auth';
import { showAlertMessage, ALERT_TYPE, ERROR_MESSAGES } from '@utils';

/**
 * Makes an API request with the specified method and endpoint.
 *
 * @async
 * @function
 * @param {string} method - The HTTP method (GET, POST, DELETE, etc.).
 * @param {string} endpoint - The API endpoint to make the request to.
 * @param {object|null} [data=null] - The data to be sent with the request, for POST or PUT requests. Defaults to null.
 * @param {boolean} [isFileUpload=false] - Whether the request involves file uploading. Defaults to false.
 * @param {boolean} [needToken=true] - Whether an access token is needed for the request. Defaults to true.
 * @return {Promise<Response>} The response object from the fetch request if successful.
 */
export async function apiRequest(method, endpoint, data = null, isFileUpload = false, needToken = true) {
  const url = `${endpoint}`;
  const csrfToken = getCSRFTokenfromCookies();
  const options = {
    method,
    headers: {
      ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      ...(isFileUpload ? {} : { 'Content-Type': 'application/json' }),
    },
    credentials: 'include',
  };

  if (data) {
    if (isFileUpload) {
      options.body = data;
    } else {
      options.body = JSON.stringify(data);
    }
  }
  devLog('Sending API request:', options);

  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      devLog('API response:', response);
    }
    if (response.ok) {
      return handlers.success(response);
    }
    if (needToken && response.status === 401) {
      return handlers[401](method, endpoint, data, isFileUpload, needToken, csrfToken);
    }
    if (response.status === 500) {
      return handlers[500](url, options);
    }
    return handlers.failure(response);
  } catch (error) {
    return handlers.exception(error);
  }
}

/**
 * Handlers for different API response statuses and exceptions.
 */
const handlers = {
  /**
   * Handles successful API responses.
   *
   * @async
   * @function
   * @param {Response} response - The response object from the fetch request.
   * @return {Promise<Object>} An object containing the success status, response status, and response data.
   */
  success: async (response) => {
    devLog('Request successful');
    let responseData = null;
    if (response.status !== 204) {
      responseData = await response.json();
    }
    return { success: true, status: response.status, data: responseData };
  },

  /**
   * Handles 401 Unauthorized responses by attempting to refresh the access token.
   *
   * @async
   * @function
   * @param {string} method - The HTTP method (GET, POST, DELETE, etc.).
   * @param {string} endpoint - The API endpoint to make the request to.
   * @param {object|null} data - The data to be sent with the request, for POST or PUT requests.
   * @param {boolean} isFileUpload - Whether the request involves file uploading.
   * @param {boolean} needToken - Whether a CSRF token is needed for the request.
   * @param {string} csrfToken - The CSRF token.
   * @return {Promise<Object>} An object containing the success status, response status, and response message.
   */
  401: async (method, endpoint, data, isFileUpload, needToken, csrfToken) => {
    const refreshResponse = await refreshAccessToken(csrfToken);
    if (refreshResponse.success) {
      return apiRequest(method, endpoint, data, isFileUpload, needToken);
    }
    if (refreshResponse.status === 401) {
      router.navigate('/login');
      showAlertMessage(ALERT_TYPE.LIGHT, ERROR_MESSAGES.SESSION_EXPIRED);
      return { success: false, status: 401, msg: 'Session expired' };
    }
    auth.clearStoredUser();
    router.navigate('/');
    showAlertMessage(ALERT_TYPE.ERROR, ERROR_MESSAGES.UNKNOWN_ERROR);
    return { success: false, status: refreshResponse.status };
  },

  /**
   * Handles 500 Internal Server Error responses by retrying the request after a delay.
   *
   * @async
   * @function
   * @param {string} url - The URL of the API endpoint.
   * @param {object} options - The options for the fetch request.
   * @return {Promise<Object>} An object containing the success status, response status, and response message.
   */
  500: async (url, options) => {
    showAlertMessage(ALERT_TYPE.ERROR, ERROR_MESSAGES.SERVER_ERROR);
    // Retry request
    setTimeout(async () => {
      const retryResponse = await fetch(url, options);
      devLog('API response:', retryResponse);
      if (retryResponse.ok) {
        devLog('Request successful');
        let responseData = null;
        if (retryResponse.status !== 204) {
          responseData = await retryResponse.json();
        }
        return { success: true, status: response.status, data: responseData };
      }
    }, 3000);
    // auth.clearStoredUser();
    // router.navigate('/');
    return { success: false, status: 500, msg: ERROR_MESSAGES.UNKNOWN_ERROR };
  },

  /**
   * Handles failed API responses.
   *
   * @async
   * @function
   * @param {Response} response - The response object from the fetch request.
   * @return {Promise<Object>} An object containing the success status, response status, and error message.
   */
  failure: async (response) => {
    const errorData = await response.json();
    let errorMsg = ERROR_MESSAGES.UNKNOWN_ERROR;
    if (Array.isArray(errorData)) {
      const foundErrorMsg = errorData.find((item) => item.msg);
      errorMsg = foundErrorMsg ? foundErrorMsg.msg : errorMsg;
    } else if (typeof errorData === 'object' && errorData.msg) {
      errorMsg = errorData.msg;
    }
    return { success: false, status: response.status, msg: errorMsg };
  },

  /**
   * Handles exceptions that occur during the API request.
   *
   * @function
   * @param {Error} error - The error object.
   * @return {Object} An object containing the success status, response status, and error message.
   */
  exception: (error) => {
    console.error('API request failed:', error);
    return { success: false, status: 0, msg: error };
  },
};
