import { API_ENDPOINTS } from '@api';

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

	console.log('Refreshing access token');
	const refreshToken = getRefreshTokenfromCookies();
	if (refreshToken && csrfToken) {
	  const refreshResponse = await fetch(API_ENDPOINTS.REFRESH, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		  'X-CSRFToken': csrfToken,
		},
		credentials: 'include',
		body: JSON.stringify({ refresh: refreshToken }),
	  });
	  if (refreshResponse.ok) {
		return true;
	  }
	  return false;
	}
}
