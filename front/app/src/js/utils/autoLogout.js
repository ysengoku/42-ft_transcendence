import { router } from '@router';

export function autoLogout() {
  console.log('Token expired. Logging out.');
  localStorage.removeItem('user');
  document.cookie = `csrftoken=; Max-Age=0; path=/;`;
  const navbar = document.querySelector('navbar-component');
  navbar.setLoginStatus(false);
  router.navigate('/');
}
