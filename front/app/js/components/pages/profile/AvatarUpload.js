export class AvatarUpload extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
        this.attachEvents();
    }

    render() {
        this.innerHTML = `
            <div class="avatar-upload-container">
                <input type="file" id="avatar-upload" accept="image/*" hidden>
                <label for="avatar-upload" class="btn btn-outline-secondary">Choose New Avatar</label>
                <div id="upload-status" class="text-muted"></div>
            </div>
        `;
    }

    attachEvents() {
        this.querySelector('#avatar-upload').addEventListener('change', (e) => this.handleFileChange(e));
    }

    async handleFileChange(event) {
        const file = event.target.files[0];
        if (!file) return;

        const statusDiv = this.querySelector('#upload-status');
        const formData = new FormData();
        formData.append('file', file);

        try {
            statusDiv.textContent = 'Uploading...';
            const response = await fetch('/api/avatar/', {
                method: 'PUT',
                body: formData,
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Upload failed');

            const result = await response.json();
            statusDiv.textContent = 'Upload successful!';
            this.dispatchEvent(new CustomEvent('avatarUpdated', {
                detail: { avatar: result.avatar },
                bubbles: true
            }));
        } catch (error) {
            console.error('Upload failed:', error);
            statusDiv.textContent = 'Upload failed. Try again.';
        }
    }
}

customElements.define('avatar-upload', AvatarUpload);
