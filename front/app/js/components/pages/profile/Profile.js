import './components/index.js';
import { apiRequest } from '../../../api/apiRequest.js';
import { API_ENDPOINTS } from '../../../api/endpoints.js';

export class UserProfile extends HTML {
	constructor() {
		super();
		this.user = null;
	}

	setParam(param) {
		const username = param.username;
		this.fetchUserData(username);
	}

	async fetchUserData(username) {
    	try {
			console.log('username:', username);
			const userData = await apiRequest('GET', API_ENDPOINTS.USER_PROFILE(username));

			this.user = userData;
			this.render();
		} catch (error) {
			console.error('Error', error);
			// Error handling
		}
	}

	render() {	
		if (!this.user) {
            console.log('User data is not available');
            return;
        }
		console.log('User data:', this.user);

		// Online status
		// const onlineStatus = document.create('online-status');
		// onlineStatus.setAttribute('online', this.user.is_online);

		// Member since - Date formatting
		// const date = new Date(this.user.date_joined);
		// const formatedDate = new Intl.DateTimeFormat('en-US', {
		// 	month: 'long',
		// 	day: 'numeric',
		// 	year: 'numeric'
		// }).format(date);
		const friendsCount = this.user.friends.length;

		const formatedDate = new Date(this.user.date_joined).toLocaleDateString();
		const onlineStatus = document.create('div');
		onlineStatus.className = this.user.is_online ? 'online' : 'offline';

		// Temporary content
		this.innerHTML = `
		<div class="container-fluid d-flex flex-column justify-content-center align-items-center">
    		<div class="d-flex justify-content-center align-items-center profile-avatar-container">
        		<img src="${this.user.avatar}" alt="User Avatar" class="rounded-circle">
    		</div>
			<div>
			<h2>This field is to check response to API request</h2>
			<h3>Basic information:</h3>
			<p>Username: ${this.user.username}</p>

			<div style="display: inline-block; position: relative;">
				${onlineStatus.outerHTML}
			</div>

			<p>Avatar path: ${this.user.avatar}</p>
			<p>Elo: ${this.user.elo}</p>

			<p>Member since: ${formatedDate}</p>
			<p>Wins: ${this.user.wins}</p>
			<p>Loses: ${this.user.loses}</p>
			<p>Win rate: ${this.user.winrate}</p>
			<p>Total score: ${this.user.scored_balls}</p>

			<h3>Best enemy</h3>
			<best-enemy user='${JSON.stringify(this.user)}'></best-enemy>

			<h3>Worst enemy</h3>
			<worst-enemy user='${JSON.stringify(this.user)}'></worst-enemy>

			<h3>Friends</h3>
			<p>Friends count: ${friendsCount}</p>

			</div>
			<div class="mb-3 pt-5">
			<a class="btn btn-outline-primary" href="/home" role="button">Back to Home</a>
			</div>
		</div>
		`;

		const worstEnemy = this.querySelector('worst-enemy');
		if (worstEnemy) {
			worstEnemy.data = this.user.worst_enemy;
		}
	}
}

customs.define('user-profile', UserProfile);
