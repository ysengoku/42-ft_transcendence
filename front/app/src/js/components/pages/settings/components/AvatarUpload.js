export class AvatarUpload extends HTMLElement {
  #state = {
    user: '',
  };

  constructor() {
    super();
    this.selectedFile = null;
    this.handleClick = this.handleClick.bind(this);
  }

  setAvatar(user) {
    this.#state.user = user;
    this.render();
  }

  disconnectedCallback() {
    this.avatarUploadButton.removeEventListener('click', this.handleClick);
  }

  render() {
    this.innerHTML = this.template() + this.style();

    this.avatarUploadButton = this.querySelector('#avatar-upload-button');
    this.avatarImage = this.querySelector('#user-avatar-image');
    this.avatarUploadButton.addEventListener('click', this.handleClick);
  }

  handleClick(event) {
    event.preventDefault();
    const modal = document.querySelector('avatar-upload-modal');
    modal.showModal((file) => {
      if (file) {
        this.selectedFile = file;
        this.avatarImage.src = URL.createObjectURL(file);
      }
    });
  }

  template() {
    const defaultAvatar = import.meta.env.VITE_DEFAULT_AVATAR; // Need to set in .env file
    const avatarUploadMessage = this.#state.user.avatar === defaultAvatar ? 'Upload Avatar' : 'Change Avatar';

    return `
		  <div class="d-flex align-items-start pb-4 border-bottom">
			  <div class="col-7 profile-avatar-container me-3">
				  <img src="${this.#state.user.avatar}" alt="User Avatar" class="rounded-circle" id="user-avatar-image">
			  </div>
			  <div class="col-5 d-flex flex-column align-items-start mx-3 my-auto py-3">
				  <b>Avatar</b>
				  <button class="btn btn-wood my-3" id="avatar-upload-button">${avatarUploadMessage}</button>
			  </div>
		  </div>
		`;
  }

  style() {
    return `
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
        .btn-wood {
          font-size: 1rem;
        }
      </style>
    `;
  }
}

customElements.define('avatar-upload', AvatarUpload);
