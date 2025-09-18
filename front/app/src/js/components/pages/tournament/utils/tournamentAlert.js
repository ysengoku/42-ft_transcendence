import { fireWork } from '@utils';

export const TOURNAMENT_ALERT_TYPE = {
  ONGOING_TOURNAMENT: 'ONGOING_TOURNAMENT',
  TOURNAMENT_STARTS: 'TOURNAMENT_STARTS',
  ROUND_END: 'ROUND_END',
  ELIMINATED: 'ELIMINATED',
  CHAMPION: 'CHAMPION',
  CANCELED: 'CANCELED',
};

const TOURNAMENT_ALERT_MESSAGE = {
  ONGOING_TOURNAMENT: 'You are currently in a tournament.',
  TOURNAMENT_STARTS: 'The tournament is starting soon.',
  ROUND_END: 'The current round of the tournament finished.',
  ELIMINATED: 'You have been eliminated from the tournament.',
  CHAMPION: (name) => `You are the champion of ${name}!`,
  FINISHED: 'The tournament is finished',
  CANCELED: 'The tournament has been canceled.',
};

const TOURNAMENT_ALERT_CTA = {
  ONGOING_TOURNAMENT: 'Go back to Tournament room',
  TOURNAMENT_STARTS: 'Join Tournament',
  ROUND_END: 'Go back to Tournament',
  ELIMINATED: 'Go back to Saloon',
  CHAMPION: 'View the results',
  FINISHED: 'Go back to Saloon',
  CANCELED: 'Go back to Saloon',
};

export function showTournamentAlert(
  tournamentId,
  type = TOURNAMENT_ALERT_TYPE.ONGOING_TOURNAMENT,
  tournamentName = '',
) {
  const alertContainer = document.getElementById('alert-message-container');
  if (!alertContainer) {
    return;
  }
  alertContainer.innerHTML = '';
  const alertMessage = document.createElement('div');
  alertMessage.innerHTML = template() + style();

  const messageElement = alertMessage.querySelector('#alert-message');
  const alertCta = alertMessage.querySelector('a');
  const headerElement = alertMessage.querySelector('#alert-header');

  switch (type) {
    case TOURNAMENT_ALERT_TYPE.CHAMPION:
      headerElement.textContent = 'Congratulations!';
      messageElement.textContent = TOURNAMENT_ALERT_MESSAGE[type](tournamentName);
      alertCta.classList.add('d-none');
      alertContainer.appendChild(alertMessage);
      const pageContentElement = document.getElementById('content');
      let fireworkDuration = 2000;
      if (pageContentElement) {
        fireworkDuration = fireWork(pageContentElement);
      }
      setTimeout(() => {
        alertContainer.classList.add('fade-out-animation');
        setTimeout(() => {
          alertContainer.innerHTML = '';
          alertContainer.classList.remove('fade-out-animation');
        }, 1000);
      }, fireworkDuration);
      return;
    case TOURNAMENT_ALERT_TYPE.ELIMINATED:
      setTimeout(() => {
        alertContainer.classList.add('fade-out-animation');
        setTimeout(() => {
          alertContainer.innerHTML = '';
          alertContainer.classList.remove('fade-out-animation');
        }, 1000);
      }, 2000);
      alertCta.classList.add('d-none');
      break;
    default:
      alertCta.textContent = TOURNAMENT_ALERT_CTA[type];
      alertCta.href = `/tournament/${tournamentId}`;
  }

  if (tournamentName) {
    headerElement.textContent = tournamentName;
  }
  messageElement.textContent = TOURNAMENT_ALERT_MESSAGE[type];
  alertContainer.appendChild(alertMessage);
}

function template() {
  return `
    <div class="old-paper"></div>
    <div class="alert alert-tournament alert-dismissible fade show" role="alert">
      <div class="d-flex flex-column align-items-center ms-4 mt-4 p-4">
        <h2 id="alert-header" class="mb-4"></h2>
        <div id="alert-message" class="fs-4 fw-bold text-center"></div>
        <div class="text-center">
          <a class="btn mt-5" id="cta-link"></a>
        </div>  
      </div>
      <button type="button" class="btn-close mt-2 me-1" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>

    <svg width="0" height="0" style="position:absolute">
      <defs>
        <clipPath id="wave-clip-paper" clipPathUnits="objectBoundingBox">
          <path d="
            M0,0.03
            C0.25,0 0.3,0.09 0.5,0.07
            C0.55,0 0.75,0.1 0.8,0.08
            C0.95,0 1,0.07 1,0.04

            C1,0.2 0.98,0.4 1,0.98

            C1,0.98 0.95,0.98 0.7,0.94
            C0.5,0.94 0.4,0.99 0.3,0.97
            C0.2,0.9 0.1,1 0,0.95

            C0,0.9 0.02,0.5 0,0.4
            C0,0.3 0.01,0.2 0,0.03
            Z
          "/>
        </clipPath>
      </defs>
    </svg>
  `;
}

function style() {
  return `
    <style>
      .alert-tournament {
        color: var(--pm-primary-700);
      }
      .old-paper::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle,rgb(197, 179, 154) 0%,rgb(161, 112, 64) 100%);
        box-shadow: inset 0 0 40px rgba(24, 15, 1, 0.3);
        clip-path: url(#wave-clip-paper)
      }
      #cta-link {
        color: var(--pm-primary-700);
      }
    </style>
  `;
}
