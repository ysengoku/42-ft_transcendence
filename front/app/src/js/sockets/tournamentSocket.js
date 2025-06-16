/**
 * Socket registration for tournament with events handlers.
 */

import { socketManager } from '@socket';
import { router } from '@router';
import { showToastNotification, TOAST_TYPES, showTournamentAlert, TOURNAMENT_ALERT_TYPE } from '@utils';

socketManager.addSocket('tournament', {
  new_registration: (data) => {
    const customEvent = new CustomEvent('newTournamentRegistration', { detail: data, bubbles: true });
    document.dispatchEvent(customEvent);
  },
  registration_cancelled: (data) => {
    const customEvent = new CustomEvent('tournamentRegistrationCancelled', { detail: data, bubbles: true });
    document.dispatchEvent(customEvent);
  },
  tournament_canceled: (data) => {
    const customEvent = new CustomEvent('tournamentCanceled', { detail: data, bubbles: true });
    document.dispatchEvent(customEvent);
    showToastNotification(`Tournament -  ${data.tournament_name} has been canceled.`, TOAST_TYPES.ERROR);
  },
  tournament_start: (data) => {
    if (window.location.pathname === '/tournament') {
      const tournamentPage = document.querySelector('tournament-room');
      // If the current page is a tournament page, set it to tournamentStart
    } else {
      showTournamentAlert(data.tournament_id, TOURNAMENT_ALERT_TYPE.TOURNAMENT_STARTS);
    }
  },
  round_start: (data) => {
    if (window.location.pathname === '/tournament') {
      // set new round data in the tournament page buffer
    }
  },
  match_finished: (data) => {
    if (window.location.pathname === '/multiplayer-game') {
      router.redirect(`tournament/${data.tournament_id}`);
    }
  },
  match_result: (data) => {
    if (window.location.pathname === '/tournament') {
      const tournamentPage = document.querySelector('tournament-room');
      tournamentPage?.updateBracket(data);
    }
  },
  round_end: (data) => {
    if (window.location.pathname === '/tournament') {
      const customEvent = new CustomEvent('tournamentRoundEnd', { detail: data, bubbles: true });
      document.dispatchEvent(customEvent);
    } else {
      showTournamentAlert(data.tournament_id, TOURNAMENT_ALERT_TYPE.ROUND_END);
    }
  },
  tournament_end: (data) => {
    // Show a toast notification
    router.redirect(`tournament/${data.tournament_id}`);
  },
});
