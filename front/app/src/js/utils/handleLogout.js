import {router} from '@router';
import '@components/navbar/components/DropdownMenu.js';

export function handleLogout(event) {
  event.preventDefault();
  localStorage.removeItem('isLoggedIn'); // Need to delete later
  localStorage.removeItem('user');

  const navBar = document.getElementById('navbar-container');
  navBar.innerHTML = '<navbar-component></navbar-component>';
  router.navigate('/');
}
