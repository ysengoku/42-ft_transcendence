export function getCSRFTokenfromCookies() {
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
