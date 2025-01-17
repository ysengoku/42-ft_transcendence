import './profile/AvatarUpload.js'; 


export class UserSetting extends HTMLElement {
    constructor() {
        super();
        this.user = null;
    }

    setParam(param) {
        this.fetchUserData(param.id);
    }

    async fetchUserData(userId) {
        try {
            const response = await fetch(`/api/users/${userId}/`, { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch user data');
            this.user = await response.json();
            this.render();
        } catch (error) {
            console.error('Error:', error);
            this.innerHTML = '<p>Failed to load user settings.</p>';
        }
    }

    async updateUserSettings(formData) {
        try {
            const response = await fetch(`/api/users/${this.user.userid}/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(formData)),
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to update settings');
            this.user = await response.json();
            this.showMessage('Settings updated successfully!', 'success');
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Failed to update settings.', 'error');
        }
    }

    showMessage(message, type) {
        const messageDiv = this.querySelector('.message');
        messageDiv.textContent = message;
        messageDiv.className = `message alert alert-${type === 'success' ? 'success' : 'danger'}`;
        setTimeout(() => messageDiv.textContent = '', 3000);
    }

    handleSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        this.updateUserSettings(formData);
    }

    handleAvatarUpdate(event) {
        this.user.avatar = event.detail.avatar;
        this.render();
    }

    render() {
        if (!this.user) return;
        this.innerHTML = `
            <div class="container">
                <h2>User Settings</h2>
                <div class="text-center">
                    <img src="${this.user.avatar}" alt="Avatar" class="rounded-circle" style="width: 150px;">
                    <avatar-upload></avatar-upload>
                </div>
                <form id="settings-form">
                    <div class="mb-3">
                        <label>Username</label>
                        <input type="text" class="form-control" name="username" value="${this.user.name}" required>
                    </div>
                    <div class="mb-3">
                        <label>Email</label>
                        <input type="email" class="form-control" name="email" value="${this.user.email || ''}" required>
                    </div>
                    <div class="message"></div>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </form>
            </div>
        `;
        this.querySelector('#settings-form').addEventListener('submit', (e) => this.handleSubmit(e));
        this.addEventListener('avatarUpdated', (e) => this.handleAvatarUpdate(e));
    }
}

customElements.define('user-setting', UserSetting);
