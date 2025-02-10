/**
 * Makes an API request with the specified method and endpoint.
 *
 * @async
 * @function
 * @param {string} method - The HTTP method (GET, POST, DELETE, etc.).
 * @param {string} endpoint - The API endpoint to make the request to.
 * @param {object|null} [data=null] - The data to be sent with the request, for POST or PUT requests. Defaults to null.
 * @param {boolean} [isFileUpload=false] - Whether the request involves file uploading. Defaults to false.
 * @param {boolean} [needToken=true] - Whether a CSRF token is needed for the request. Defaults to true.
 * @returns {Promise<Response>} The response object from the fetch request if successful.
 * @throws {Error} Throws an error with the status and error message if the request fails.
 *
 * @example
 * // Example usage: Sending a GET request to fetch user data
 * try {
 *   const response = await apiRequest('GET', '/api/user/data');
 *   const data = await response.json();
 *   console.log('User Data:', data);
 * } catch (error) {
 *   console.error('Error fetching user data:', error.message);
 *   if (error.response) {
 *     console.error('Response Data:', error.response);
 *   }
 * }
 */

import { auth, getCSRFTokenfromCookies, refreshAccessToken } from '@auth';

export async function apiRequest(method, endpoint, data = null, isFileUpload = false, needToken = true) {
  const url = `${endpoint}`;
  const csrfToken = getCSRFTokenfromCookies();
  const needCSRF = needToken && ['POST', 'DELETE'].includes(method) && csrfToken;
  const options = {
    method,
    headers: {
      ...(needCSRF ? { 'X-CSRFToken': csrfToken } : {}),
      ...(isFileUpload ? {} : { 'Content-Type': 'application/json' }),
    },
    credentials: 'include',
  };

  if (data) {
    if (isFileUpload) {
      const formData = new FormData();
      formData.append('file', data);
      options.body = formData;
    } else {
      options.body = JSON.stringify(data);
    }
  }
  console.log('Sending API request:', options);

  try {
    const response = await fetch(url, options);
    console.log('API response:', response);
    if (response.ok) {
      console.log('Request successful:', response);
      const responseData = await response.json();
      console.log('Response data:', responseData);
      return { success: true, status: response.status, data: responseData };
    }
    if (needToken && response.status === 401) {
      console.log('Unauthorized request:', response);
      const refreshResponse = await refreshAccessToken(csrfToken);
      if (refreshResponse.success) {
        return apiRequest(method, endpoint, data, isFileUpload, needToken);
      } else if (refreshResponse.status === 401) {
        auth.clearSession();
        return { success: false, status: 401, msg: 'Session expired' };
      } else if (refreshResponse.status === 500) {
        // Show message to user
        return { success: false, status: 500, msg: 'Server error' };
      }
    }
    const errorData = await response.json();
    let errorMsg = 'An unexpected error occurred. Please try again later.';
    if (Array.isArray(errorData)) {
      const foundErrorMsg = errorData.find((item) => item.msg);
      errorMsg = foundErrorMsg ? foundErrorMsg.msg : errorMsg;
    } else if (typeof errorData === 'object' && errorData.msg) {
      errorMsg = errorData.msg;
    }
    return { success: false, status: response.status, msg: errorMsg };
  } catch (error) {
    return { success: false, status: 0, msg: error };
  }
}
