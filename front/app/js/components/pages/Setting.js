import { simulateFetchUserData } from '../../mock/simulateFetchUserData.js'

export class Setting extends HTMLElement {
	constructor() {
		super();
	}

	setParam(param) {
		const userId = param.id;
		this.fetchUserData(userId);
	}

	async fetchUserData(userId) {
    	try {
      		const userData = await simulateFetchUserData(userId);
      		this.user = userData;
      		this.render();
    	} catch (error) {
      		console.error('Error fetching user data:', error);
    	}
  	}

	async handleAvatarUpload(event) {
		event.preventDefault();

		const formData = new FormData();
		const fileInput = document.querySelector('#avatar-upload');
		const file = fileInput.files[0];

		if (file) {
			formData.append('avatar_new_image', file);

			try {
				// Remplacer ceci par une requête pour votre API backend
				const response = await fetch('/api/upload-avatar/', {
					method: 'POST',
					body: formData,
				});
				const data = await response.json();

				// Mettre à jour l'avatar de l'utilisateur avec la nouvelle image
				if (data.avatar_url) {
					this.user.avatar = data.avatar_url;
					this.render();
				}
			} catch (error) {
				console.error('Error uploading avatar:', error);
			}
		}
	}

	render() {
		this.innerHTML = `
		<div class="container d-flex flex-column justify-content-center align-items-center text-center">
			<h1>This is Setting page</h1>
			<p>Name: ${this.user.name}</p>
			<p>ID: ${this.user.userid}</p>

			<div class="d-flex justify-content-center align-items-center profile-avatar-container">
				<img src="${this.user.avatar}" alt="User Avatar" class="rounded-circle">
			</div>

			<!-- Formulaire pour uploader un nouvel avatar -->
			<form id="avatar-upload-form" class="mt-3">
				<input type="file" id="avatar-upload" name="avatar" accept="image/*" class="form-control">
				<button type="submit" class="btn btn-primary mt-2">Upload Avatar</button>
			</form>

			<div class="mb-3 pt-5">
				<a class="btn btn-primary" href="/home" role="button">Back to Home</a>
			</div>
		</div>
		`;

		// Ajouter un événement de soumission pour l'upload
		document.querySelector('#avatar-upload-form').addEventListener('submit', this.handleAvatarUpload.bind(this));
	}
}

customElements.define('user-setting', Setting);
