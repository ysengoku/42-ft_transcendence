import { API_ENDPOINTS } from '@api';
import { ERROR_MESSAGES, showErrorMessage } from '@utils';

export async function refreshAccessToken(csrfToken) {
  function getRefreshTokenfromCookies() {
    const name = 'refresh_token';
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

  async function retryRefreshTokenRequest(request, delay, maxRetries) {
    let retries = 0;
    setTimeout(async () => {
      if (retries < maxRetries) {
        const response = await fetch(API_ENDPOINTS.REFRESH, request);
        if (response.ok) {
          return { success: true, status: 204 };
        } else if (response.status === 500) {
          ++retries;
        } else {
          console.error('Refresh failed:', refreshResponse);
          return { success: false, status: response.status };
        }
      }
      console.error('Refresh failed:', refreshResponse);
      showErrorMessage(ERROR_MESSAGES.UNKNOWN_ERROR);
      return { success: false, status: 500 };
    }, delay);
  }

  console.log('Refreshing access token');
  const refreshToken = getRefreshTokenfromCookies();
  if (refreshToken && csrfToken) {
    try {
      const request = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ refresh: refreshToken }),
      };
      const refreshResponse = await fetch(API_ENDPOINTS.REFRESH, request);
      console.log('Refresh response:', refreshResponse);
      if (refreshResponse.ok) {
        console.log('Refresh successful');
        return { success: true, status: 204 };
      } else if (refreshResponse.status === 500) {
        showErrorMessage(ERROR_MESSAGES.SERVER_ERROR);
        console.log('Retrying refresh token request');
        return retryRefreshTokenRequest(request, 3000, 3);
      }
      console.error('Refresh failed:', refreshResponse);
      return { success: false, status: refreshResponse.status };
    } catch (error) {
      console.error(error);
      return { success: false, status: 0 };
    }
  }
  return { success: false, status: 401 };
}
