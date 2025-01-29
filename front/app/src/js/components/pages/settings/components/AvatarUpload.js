export class AvatarUpload extends HTMLElement {
  constructor() {
    super();
    this._user = '';
    this.selectedFile = null;
  }

  setAvatar(user) {
    this._user = user;
    this.render();
  }

  render() {
    const defaultAvatar = import.meta.env.VITE_DEFAULT_AVATAR;
    // const avatarUploadMessage = this._user.hasOwnAvatar ? 'Change Avatar' : 'Upload Avatar';
    const avatarUploadMessage = this._user.avatar === defaultAvatar ? 'Change Avatar' : 'Upload Avatar';

    this.innerHTML = `
      <style>
        .profile-avatar-container {
          width: 160px;
          height: 160px;
        }
        .profile-avatar-container img {
          width: 100%;
          height: 100%;
          aspect-ratio: 1;
          object-fit: cover;
        }
      </style>	
		<div class="d-flex align-items-start pb-4 border-bottom">
			<div class="col-7 profile-avatar-container me-3">
				<img src="${this._user.avatar}" alt="User Avatar" class="rounded-circle">
			</div>
			<div class="col-5 d-flex flex-column align-items-start mx-3 my-auto py-3">
				<b>Avatar</b>
				<button class="btn btn-primary my-3" id="avatar-upload-button">${avatarUploadMessage}</button>
			</div>
		</div>
		`;

    const avatarUploadButton = this.querySelector('#avatar-upload-button');
    avatarUploadButton.addEventListener('click', () => {
      const modal = document.querySelector('avatar-upload-modal');
      modal.showModal((file) => {
        console.log('File selected:', file);
        this.selectedFile = file;
      });
    });
  }
}

customElements.define('avatar-upload', AvatarUpload);
