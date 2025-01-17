import './profile/AvatarUpload.js'; 

export class UserProfile extends HTMLElement {
    constructor() {
        super();
        this.user = null;
    }

    async fetchUserData(userId) {
        try {
            const response = await fetch(`/api/users/${userId}/`, { credentials: 'include' });
            if (!response.ok) throw new Error('User not found');
            this.user = await response.json();
            this.render();
        } catch (error) {
            console.error('Error:', error);
            this.innerHTML = `<p>User not found.</p>`;
        }
    }

    setParam(param) {
        this.fetchUserData(param.id);
    }

    handleAvatarUpdate(event) {
        this.user.avatar = event.detail.avatar;
        this.render();
    }

    render() {
        if (!this.user) return;
        this.innerHTML = `
            <div class="container text-center">
                <h1>${this.user.name}'s Profile</h1>
                <img src="${this.user.avatar}" alt="Avatar" class="rounded-circle" style="width: 150px;">
                <avatar-upload></avatar-upload>
                <div class="mt-3">
                    <a href="/home" class="btn btn-outline-primary">Back to Home</a>
                </div>
            </div>
        `;
        this.addEventListener('avatarUpdated', (e) => this.handleAvatarUpdate(e));
    }
}

customElements.define('user-profile', UserProfile);
