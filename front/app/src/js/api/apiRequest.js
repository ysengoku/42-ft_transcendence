import { router } from '@router';
import { auth, getCSRFTokenfromCookies, refreshAccessToken } from '@auth';
import { sessionExpiredToast, internalServerErrorAlert, unknowknErrorToast } from '@utils';

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
  log.info('Sending API request:', method, url);

  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      log.info('API response:', response);
    }
    if (response.ok) {
      return handlers.success(response);
    }
    if (needToken && response.status === 401) {
      return handlers[401](method, endpoint, data, isFileUpload, needToken, csrfToken);
    }
    if (response.status === 429) {
      return handlers[429](response);
    }
    if (response.status === 500) {
      return handlers[500](url, options);
    }
    return handlers.failure(response);
  } catch (error) {
    return handlers.exception(error);
  }
}

export const API_ERROR_MESSAGE = {
  default: 'Something went wrong. Please try again later.',
  401: 'Session expired',
  429: 'Unable to process your request right now. Please try again later',
};

/**
 * Handlers for different API response statuses and exceptions.
 */
const handlers = {
  /**
   * Handles successful API responses.

   * @async
   * @function
   * @param {Response} response - The response object from the fetch request.
   * @return {Promise<Object>} An object containing the success status, response status, and response data.
   */
  success: async (response) => {
    log.info('Request successful with', response.status);
    let responseData = {};
    if (response.status !== 204) {
      try {
        responseData = await response.json();
      } catch (error) {
        log.error('Failed to parse JSON response:', error);
        responseData = {};
      }
    }
    log.info('Response data:', responseData);
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
   * @param {string} csrfToken - The CSRF token for the request.
   * @return {Promise<Object>} An object containing the success status, response status, and response message.
   */
  401: async (method, endpoint, data, isFileUpload, needToken, csrfToken) => {
    const refreshResponse = await refreshAccessToken(csrfToken);
    let message = '';
    switch (refreshResponse.status) {
      case 204:
        return apiRequest(method, endpoint, data, isFileUpload, needToken);
      case 401:
        router.redirect('/login');
        sessionExpiredToast();
        message = API_ERROR_MESSAGE[401];
        break;
      case 429:
        message = API_ERROR_MESSAGE[429];
        router.redirect(`/error?error=${message}`);
        return { success: false, status: 429, message };
      default:
        router.redirect('/');
        unknowknErrorToast();
        break;
    }
    auth.clearStoredUser();
    return { success: false, status: refreshResponse.status, msg: message };
  },

  /**
   * Handles 429 Too many request.
   *
   * @async
   * @function
   * @param {Response} response - The response object from the fetch request.
   * @return {Promise<Object>} An object containing the success status, response status, and error message.
   */
  429: async () => {
    const message = API_ERROR_MESSAGE[429];
    router.redirect(`/error?error=${message}`);
    return { success: false, status: 429, message };
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
    const message = API_ERROR_MESSAGE.default;
    internalServerErrorAlert();
    // Retry request
    setTimeout(async () => {
      const retryResponse = await fetch(url, options);
      log.info('API response:', retryResponse);
      if (retryResponse.ok) {
        log.info('Request successful');
        let responseData = {};
        if (retryResponse.status !== 204) {
          try {
            responseData = await retryResponse.json();
          } catch (error) {
            log.error('Failed to parse JSON response:', error);
            responseData = {};
          }
        }
        return { success: true, status: response.status, data: responseData };
      }
    }, 3000);
    return { success: false, status: 500, msg: message };
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
    let errorData = {};
    try {
      errorData = await response.json();
    } catch (error) {
      log.error('Failed to parse JSON response:', error);
      errorData = {};
    }
    let errorMsg = API_ERROR_MESSAGE.default;
    if (Array.isArray(errorData)) {
      const foundErrorMsg = errorData.find((item) => item.msg);
      errorMsg = foundErrorMsg ? foundErrorMsg.msg : errorMsg;
    } else if (typeof errorData === 'object' && errorData.msg) {
      errorMsg = errorData.msg;
    }
    const excludedStatusCodes = [401, 403, 404, 422, 429];
    if (!excludedStatusCodes.includes(response.status)) {
      unknowknErrorToast();
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
    log.error('API request failed:', error);
    unknowknErrorToast();
    return { success: false, status: 0, msg: error };
  },
};
