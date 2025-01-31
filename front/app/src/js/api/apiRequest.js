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
 * @throws {Error} Throws an error with the status and response data if the request fails.
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

export async function apiRequest(method, endpoint, data = null, isFileUpload = false, needToken = true) {
  function getCSRFTokenfromCookies() {
    const name = 'csrftoken';
    let token = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith(name)) {
          token = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return token;
  }

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
    if (response.ok) {
      console.log('Request successful:', response);
      return response;
    }
    const error = new Error('Request failed');
    error.status = response.status;
    let errorData = null;
    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
      errorData = await response.json();
    } else if (contentType && contentType.includes('text/html')) {
      errorData = await response.text();
    }
    console.log('Error Data: ', errorData);
    error.response = errorData;
    throw error;
  } catch (error) {
    throw error;
  }
}
