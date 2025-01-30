export async function apiRequest(method, endpoint, data = null, isFileUpload = false, needToken = true) {
  function getCSRFTokenfromCookies() {
    const name = 'csrftoken';
    let token = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i].trim();
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
      return await response.json();
    }
    console.error('Request failed:', response);
    const error = new Error();
    error.status = response.status;
    let errorData = null;
    try {
      console.log('Error response:', response);
      errorData = await response.json();
      error.response = errorData;
    } catch (jsonError) {
      console.error('Failed to parse JSON:', jsonError);
    }
    throw error;
  } catch (error) {
    throw error;
  }
}

// Example usage
// async function getUserData(username) {
//     try {
//         const data = await apiRequest('GET', API_ENDPOINTS.GET_USER_DATA(username));
//         console.log(data);
//     } catch (error) {
//         // Error handling
//     }
// }
