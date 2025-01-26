export class ProfileAvatar extends HTMLElement {
    constructor() {
        super();
        this._avatarUrl = '';
    }

    set avatarUrl(url) {
        this._avatarUrl = url;
        this.render();
    }
    
    connectedCallback() {
        this.render();
    }
	
    render() {
		console.log('Avatar URL:', this._avatarUrl);
        const avatarUrl = this._avatarUrl;
        this.innerHTML = `
            <style>
                .profile-avatar-container {
                    width: 100%;  
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: auto;
                }
                .profile-avatar-frame {
                    width: 90%;
                    background-color: rgba(89, 70, 57, 0.4);
                }
                .profile-avatar-container img {
                    width: 144px;
                    aspect-ratio: 1;
                    object-fit: cover;
                    border-radius: 50%;
                    background-color: grey;
                }
            </style>
            <div class="profile-avatar-container">
                <div class="profile-avatar-frame d-flex justify-content-center align-items-center p-2">
                    <img src="${avatarUrl}" alt="Avatar" class="rounded-circle">
                </div>
            </div>
        `;
    }
}

customElements.define('profile-avatar', ProfileAvatar);
