import { simulateFetchUserData } from '../../../../mock/functions/simulateFetchUserData.js'
// import { apiRequest } from '../../api/apiRequest.js'
// import { API_ENDPOINTS } from '../../api/endpoints.js';

export class UserProfile extends HTMLElement {
	constructor() {
		super();
		this.user = null;
	}

	setParam(param) {
		const username = param.username;
		this.fetchUserData(username);
	}

	// Simulation with mock data
	async fetchUserData(username) {
    	try {
      		const userData = await simulateFetchUserData(username);
      		this.user = userData;
      		this.render();
    	} catch (error) {
      		console.error('Error fetching user data:', error);
			// Show "User not exists Page"?
    	}
  	}

	// async fetchUserData(username) {
    // 	try {
	// 		const response = await apiRequest('GET', API_ENDPOINTS.GET_USER_DATA(username));
	// 		const userData = await response.json();
	// 		this.user = userData;
	// 		this.render();
	// 	} catch (error) {
	// 		console.error('Error', error);
	// 		// Error handling
	// 	}
	// }

	render() {	
		if (!this.user) {
            console.log('User data is missing');
            return;
        }
		console.log('User data:', this.user);
		const friendsCount = this.user.friends.length;

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
			<p>Avatar path: ${this.user.avatar}</p>
			<p>Elo: ${this.user.elo}</p>
			<p>Online: ${this.user.is_online ? 'Yes' : 'No'}</p>
			<p>Member since: ${this.user.date_joined}</p>
			<p>Wins: ${this.user.wins}</p>
			<p>Loses: ${this.user.loses}</p>
			<p>Win rate: ${this.user.winrate}</p>
			<p>Total score: ${this.user.scored_balls}</p>

			<h3>Best enemy</h3>
			<p>Username: ${this.user.best_enemy.username}</p>
			<p>Avatars: ${this.user.best_enemy.avatar}</p>
			<p>Wins: ${this.user.best_enemy.wins}</p>
			<p>Loses: ${this.user.best_enemy.loses}</p>
			<p>Win rate: ${this.user.best_enemy.winrate}</p>
			<p>Elo: ${this.user.best_enemy.elo}</p>

			<h3>Worst enemy</h3>
			<p>Username: ${this.user.worst_enemy.username}</p>
			<p>Avatars: ${this.user.worst_enemy.avatar}</p>
			<p>Wins: ${this.user.worst_enemy.wins}</p>
			<p>Loses: ${this.user.worst_enemy.loses}</p>
			<p>Win rate: ${this.user.worst_enemy.winrate}</p>
			<p>Elo: ${this.user.worst_enemy.elo}</p>

			<h3>Friends</h3>
			<p>Friends count: ${friendsCount}</p>

			</div>
			<div class="mb-3 pt-5">
			<a class="btn btn-outline-primary" href="/home" role="button">Back to Home</a>
			</div>
		</div>
		`;
	}
}

customElements.define('user-profile', UserProfile);
