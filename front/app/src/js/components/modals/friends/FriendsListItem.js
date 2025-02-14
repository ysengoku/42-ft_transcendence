// import { router } from '@router';

// export class FriendsListItem extends HTMLElement {
//   constructor() {
//     super();
//     this.username = '';
//     this.nickname = '';
//     this.avatar = '';
//     this.online = false;
//   }

//   connectedCallback() {
//     this.setAttributes();
//     this.render();
//     this.addEventListener('click', () => {
//       const modal = document.querySelector('friends-list-modal');
//       modal.hideModal();
//       router.navigate(`/profile/${this.username}`);
//     });
//   }

//   setAttributes() {
//     this.username = this.getAttribute('username');
//     this.nickname = this.getAttribute('nickname');
//     this.avatar = this.getAttribute('avatar');
//     this.online = this.getAttribute('online') === 'true';
//   }

//   static get observedAttributes() {
//     return ['online'];
//   }

//   attributeChangedCallback(name, oldValue, newValue) {
//     if (name === 'online') {
//       this.online = newValue === 'true';
//       this.updateOnlineStatus();
//     }
//   }

//   updateOnlineStatus() {
//   }

//   render() {
//     this.innerHTML = `
//     <style>
//       .friends-list-item {
//         border: none;
//         padding: 16px 32px;
//         border-bottom: 1px solid var(--bs-border-color);
//         position: relative;
//       }
//       friends-list-item:last-of-type .friends-list-item {
//         border-bottom: none;
//         padding-bottom: 8px;
//       }
//       .avatar-container {
//         position: relative;
//         display: inline-block;
//         margin-right: 10px;
//       }
//       .friends-list-avatar {
//         width: 56px;
//         height: 56px;
//         object-fit: cover;
//       }
//       .friends-list-status-indicator {
//         position: absolute;
//         width: 16px;
//         height: 16px;
//         bottom: 0;
//         right: 16%;
//         border-radius: 50%;
//         background-color: gray;
//         border: 2px solid var(--bs-body-bg);
//       }
//       .friends-list-status-indicator.online {
//         background-color: green;
//       }
//     </style>
// 		<li class="list-group-item friends-list-item">
//       <div class="d-flex flex-row align-items-center">
// 			  <div class="avatar-container">
// 				  <img src="${this.avatar}" alt="Avatar" class="rounded-circle me-3 friends-list-avatar">
// 				  <span class="friends-list-status-indicator ${this.online ? 'online' : ''} ms-3"></span>
// 			  </div>
//         <div class="d-flex flex-column justify-content-center">
//           <p class="m-0 fs-5">${this.nickname}</P>
// 			    <p class="m-0 fw-light">@${this.username}</p>
//         </div>
//       <div>
// 		</li>
// 	`;
//   }
// }

// customElements.define('friends-list-item', FriendsListItem);
