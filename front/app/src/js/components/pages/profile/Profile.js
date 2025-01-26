import { apiRequest } from '@api/apiRequest.js';
import { API_ENDPOINTS } from '@api/endpoints.js';
import './components/index.js';
import poster from '../../../../../public/img/sample-background.png';


export class UserProfile extends HTMLElement {
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
			// Error handling
			if (error.status === 404) {
				// 404 page & message
			} else {
				// Something went wrong page & message
			}
		}
	}

	render() {	
		if (!this.user) {
            console.log('User data is not available');
            return;
        }
		console.log('User data:', this.user);

		const friendsCount = this.user.friends.length;
		
		// Online status
		const onlineStatus = document.createElement('profile-online-status');
		onlineStatus.setAttribute('online', this.user.is_online);

		this.innerHTML = `
		<style>
			.poster {
				background-image: url(${poster});
    			background-size: cover;
    			background-position: center;
    			background-repeat: no-repeat;
				color: black;
			}
			.online-status-indicator {
    			width: 16px;
    			height: 16px;
    			border-radius: 50%;
    			background-color: gray;
    			display: inline-block;
			}
			.online-status-indicator.online {
    			background-color: green;
			}
			.enemy-avatar-container {
			    display: flex;
    			justify-content: center;
    			align-items: center;
    			height: auto;
			}
			.enemy-avatar-container img {
    			width: 88px;
    			aspect-ratio: 1;
    			object-fit: cover;
			}
			.no-margin {
    			margin: 0;
			}
			.row.no-gutters > [class*='col-'] {
   				padding-right: 0;
    			padding-left: 0;
			}
		</style>

		<div class="container-fluid d-grid gap-3">
			<div class="row h-100 no-gutters">

			<!-- Container Left -->
			<div class="d-flex col-12 col-md-6">
				<div class="poster container-fluid d-flex flex-column flex-grow-1 mx-1 my-3 p-3 gap-2">

				<!-- Container Top -->
				<div class="flex-grow-1">
					<div class="text-center">
						<div class="mb-3 w-100 text-center pt-3">
							<div class="d-flex flex-row align-items-center">
								<hr class="flex-grow-1">	
								${onlineStatus.outerHTML}
								<hr class="flex-grow-1">
							</div>
							<h1>WANTED</h1>
							<hr>
						</div>
					</div>
					<profile-avatar></profile-avatar>
					<profile-user-info></profile-user-info>
				</div>

				<!-- Container Bottom -->
				<div class="flex-grow-1">
					<!-- Buttons -->
					<div class="d-flex flex-row justify-content-center my-2">
						<button class="btn btn-primary mx-1">Edit Profile</button>
						<button class="btn btn-primary mx-1">Edit Profile</button>
						<button class="btn btn-primary mx-1">Edit Profile</button>
					</div>

					<!-- Stats -->
					<div class="d-flex flex-row justify-content-around mt-5">
						<div class="row w-100">
							<div class="col-3 text-center">
								<p>Elo</p>
								<p>1555</p>
							</div>
							<div class="col-3 text-center">
								<p>Total score</p>
								<p>623</p>
							</div>
							<div class="col-3 text-center">
								<p>Total duals</p>
								<p>35</p>
							</div>
							<div class="col-3 text-center">
								<p>Friends</p>
								<p>11</p>
							</div>
						</div>
					</div>

					<!-- Graphs -->
					<div class="d-flex flex-row justify-content-around align-items-top">
						<div class="row h-100 m-3 p-2">
							<div class="col-md-6">
								<p>Win Rate</p>
								<canvas id="winRateChart">

								</canvas>
							</div>
							<div class="col-md-6">
								<p>Elo progression</p>
								<canvas id="eloProgressionChart"></canvas>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Container Right -->
					<div class="d-flex col-12 col-md-6">
						<div class="poster container-fluid d-flex flex-column flex-grow-1 mx-1 my-3 p-3 gap-2">

							<!-- Container Top -->
							<div class="d-grid">
								<div class="row no-gutters no-margin py-3">
									<div class="col-6">
										<div class="d-flex flex-column p-3" style="background-color:darkolivegreen">
											<p class="no-margin ms-1">Best enemy</p>
											<div class="d-flex flex-row justify-content-around">
												<div class="text-center enemy-avatar-container">
													<img src="/media/avatars/sample_avatar.jpg" alt="User Avatar" class="rounded-circle">
												</div>
												<div class="mb-1">
													<p class="lh-1 fs-5">GeorgeLucas</p>
													<p class="no-margin fs-6">Elo: 1555</p>
													<p class="no-margin fs-6">Win rate: 50%</p>
													<small>win 25 - losses 25</small>
												</div>
											</div>
										</div>
									</div>
									<div class="col-6">
										<div class="d-flex flex-column p-3" style="background-color: darkcyan;">
											<p class="no-margin ms-1">Worst enemy</p>
											<div class="d-flex flex-row justify-content-around">
												<div class="text-center enemy-avatar-container">
													<img src="/media/avatars/sample_avatar2.jpg" alt="User Avatar" class="rounded-circle">
												</div>
												<div class="mb-1">
													<p class="lh-1 fs-5">GeorgeLucas</p>
													<p class="no-margin fs-6">Elo: 1555</p>
													<p class="no-margin fs-6">Win rate: 50%</p>
													<small>win 25 - losses 25</small>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>

							<!-- Container Bottom -->
							<div class="flex-grow-1 d-flex flex-column p-3" style="background-color:chocolate;">
								<p>Match History</p>
							</div>
						</div>
					</div>
				</div>
			</div>`;

		const profileAvatar = this.querySelector('profile-avatar');
		if (profileAvatar) {
			profileAvatar.avatarUrl = this.user.avatar;
		}

		const profileUserInfo = this.querySelector('profile-user-info');
		if (profileUserInfo) {
			profileUserInfo.username = this.user.username;
			profileUserInfo.join_date = this.user.date_joined;
			profileUserInfo.titre = this.user.titre;
		}

		const worstEnemy = this.querySelector('worst-enemy');
		if (worstEnemy) {
			worstEnemy.data = this.user.worst_enemy;
		}

		const bestEnemy = this.querySelector('best-enemy');
		if (bestEnemy) {
			bestEnemy.data = this.user.best_enemy;
		}
	}
}

customElements.define('user-profile', UserProfile);
