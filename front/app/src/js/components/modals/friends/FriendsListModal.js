// import { router } from '@router';
// import { auth } from '@auth';
// import { apiRequest, API_ENDPOINTS } from '@api';
// import { showErrorMessageForDuration, ERROR_MESSAGES } from '@utils';
// // import { simulateFetchFriendsList } from '@mock/functions/simulateFetchFriendsList.js';

// export class FriendsListModal extends HTMLElement {
//   constructor() {
//     super();
//     this.modal = null;
//     this.friendsList = [];
//     this.username = '';
//     this.totalFriendsCount = 0;
//   }

//   connectedCallback() {
//     this.render();
//   }

//   showModal() {
//     this.fetchFriendsData();
//     if (this.modal) {
//       this.modal.show();
//     }
//     this.renderSearchBar();
//   }

//   hideModal() {
//     const mainContent = document.querySelector('#content');
//     if (mainContent) {
//       mainContent.focus();
//     }
//     if (this.modal) {
//       this.modal.hide();
//     }
//   }

//   async fetchFriendsData() {
//     // this.friendsList = await simulateFetchFriendsList();
//     this.username = auth.getStoredUser().username;
//     const listLength = this.friendsList.length;
//     const response = await apiRequest(
//         'GET',
//         /* eslint-disable-next-line new-cap */
//         API_ENDPOINTS.USER_FRIENDS_LIST(this.username, 10, listLength),
//         null, false, true);
//     if (response.success) {
//       if (response.data) {
//         this.totalFriendsCount = response.data.count;
//         this.friendsList.push(...response.data.items);
//       }
//       this.renderFriendsList();
//     } else {
//       this.hideModal();
//       if (response.status === 401) {
//         showErrorMessageForDuration(ERROR_MESSAGES.SESSION_EXPIRED, 5000);
//         router.navigate('/login');
//       } else {
//         showErrorMessageForDuration(ERROR_MESSAGES.UNKNOWN_ERROR, 5000);
//         router.navigate('/');
//       }
//     }
//   }

//   renderSearchBar() {
//     const friendSearchBar = this.querySelector('friend-search-bar');
//     if (friendSearchBar) {
//       friendSearchBar.render();
//     }
//   }

//   renderNoFriendsFound(listContainer) {
//     const noFriends = document.createElement('li');
//     noFriends.innerHTML = `
//       <style>
//         .list-group-item {
//           border: none;
//           position: relative;
//         }
//         li {
//           list-style-type: none;
//         }
//       </style>
//       <div class="list-group-item p-3">
//         <p class="text-center m-0">No friends found</p>
//       </div>
//     `;
//     listContainer.appendChild(noFriends);
//   }

//   renderShowMoreButton(listContainer) {
//     const showMoreButton = document.createElement('li');
//     showMoreButton.innerHTML = `
//       <style>
//         #show-more-friends {
//           border: none;
//           position: relative;
//           border-top: 1px solid var(--bs-border-color);
//         }
//         li {
//           list-style-type: none;
//         }
//       </style>
//       <div class="list-group-item mt-4 p-3" id="show-more-friends">
//         <p class="text-center m-0">Show more friends</p>
//       </div>
//     `;
//     listContainer.appendChild(showMoreButton);

//     const button = showMoreButton.querySelector('#show-more-friends');
//     if (button) {
//       button.addEventListener('click', () => {
//         this.fetchFriendsData();
//       });
//     }
//   }

//   renderFriendsList() {
//     const listContainer = this.querySelector('#friends-list');
//     listContainer.innerHTML = '';
//     if (this.friendsList.length === 0) {
//       this.renderNoFriendsFound(listContainer);
//       return;
//     }
//     this.friendsList.forEach((friend) => {
//       // console.log(`Rendering friend:`, friend);
//       const listItem = document.createElement('friends-list-item');
//       listItem.setAttribute('username', friend.username);
//       listItem.setAttribute('nickname', friend.nickname);
//       listItem.setAttribute('avatar', friend.avatar);
//       listItem.setAttribute('online', friend.is_online);
//       listContainer.appendChild(listItem);
//     });
//     if (this.friendsList.length < this.totalFriendsCount) {
//       this.renderShowMoreButton(listContainer);
//     }
//     const mainView = document.getElementById('content');
//     mainView.addEventListener('click', () => {
//       this.hideModal();
//     });
//   }

//   render() {
//     this.innerHTML = `
//     <style>
//       #friends-modal .modal-dialog {
//         position: fixed;
//         top: var(--navbar-height, 72px);
//         right: 0;
//         height: calc(100vh - var(--navbar-height, 72px));
//         margin: 0;
//         border-radius: 0;
//       }
//     </style>
// 		<div class="modal fade" id="friends-modal" tabindex="-1">
// 			<div class="modal-dialog modal-dialog-scrollable">
//    			<div class="modal-content">
//           <div class="modal-header d-flex flex-column align-items-start">
//     				<div class="d-flex justify-content-between w-100">
//         			<h5 class="modal-title">Friends</h5>
//         			<button type="button" class="btn-close" data-bs-dismiss="modal"></button>
//             </div>
//             <div class="ps-2 pe-3 pt-3">
//               <friend-search-bar></friend-search-bar>
//       			</div>
//           </div>
// 					<div class="modal-body">
// 						<ul class="list-group" id="friends-list"></ul>
// 					</div>
// 				</div>
// 			</div>
// 		</div>
// 		`;

//     this.modal = new bootstrap.Modal(this.querySelector('#friends-modal'));
//   }
// }

// customElements.define('friends-list-modal', FriendsListModal);
