import { router } from '@router';
import { auth } from '@auth/authManager.js';

export function autoLogout() {
  console.log('Token expired. Logging out.');
  auth.clearUser();
  document.cookie = `csrftoken=; Max-Age=0; path=/;`;
  const navbar = document.querySelector('navbar-component');
  navbar.setLoginStatus(false);
  router.navigate('/');
}
