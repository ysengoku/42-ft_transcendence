/**
 * Socket registration for tournament with events handlers.
 */

import { socketManager } from '@socket';
import { router } from '@router';
import { showToastNotification, TOAST_TYPES } from '@utils';
import { showTournamentAlert, TOURNAMENT_ALERT_TYPE } from '@components/pages/tournament/utils/tournamentAlert';


socketManager.addSocket('tournament', {
  // TESTED
  new_registration: (data) => {
    devLog('New tournament registration:', data);
    if (window.location.pathname.startsWith('/tournament')) {
      const tournamentPendingContentElement = document.querySelector('tournament-pending');
      tournamentPendingContentElement?.addParticipant(data);
    }
  },
  // TESTED
  registration_canceled: (data) => {
    devLog('Tournament registration canceled:', data);
    if (window.location.pathname.startsWith('/tournament')) {
      const tournamentPendingContentElement = document.querySelector('tournament-pending');
      tournamentPendingContentElement?.removeParticipant(data);
    }
  },
  // TESTED
  tournament_canceled: (data) => {
    devLog('Tournament canceled:', data);
    if (window.location.pathname.startsWith('/tournament')) {
      const tournamentPageElement = document.querySelector('tournament-room');
      tournamentPageElement?.handleTournamentCanceled(data);
    } else {
      showToastNotification(`Tournament -  ${data.tournament_name} has been canceled.`, TOAST_TYPES.ERROR);
    }
  },
  // TESTED
  tournament_start: (data) => {
    devLog('Tournament starts:', data);
    if (window.location.pathname.startsWith('/tournament')) {
      const tournamentPage = document.querySelector('tournament-room');
      tournamentPage?.handleTournamentStart(data);
    } else {
      showTournamentAlert(data.tournament_id, TOURNAMENT_ALERT_TYPE.TOURNAMENT_STARTS);
    }
  },
  // TESTED
  round_start: (data) => {
    if (window.location.pathname.startsWith('/tournament')) {
      const tournamentPage = document.querySelector('tournament-room');
      if (!tournamentPage) {
        devErrorLog('Tournament RoundStart Element not found, cannot update UI.');
        return;
      }
      tournamentPage.setNextRound(data);
    }
  },
  match_finished: (data) => {
    // TODO: Adjust depending which ws sends this message (tournament or pong)
    if (window.location.pathname.startsWith('/multiplayer-game')) {
      router.redirect(`tournament/${data.tournament_id}`);
    }
  },
  // TESTED
  match_result: async (data) => {
    if (!window.location.pathname.startsWith('/tournament')) {
      return;
    }
    const tournamentPage = document.querySelector('tournament-room');
    if (!tournamentPage) {
      devErrorLog('Tournament RoundOngoing Element not found, cannot update bracket.');
      return;
    }
    tournamentPage.updateMatchResult(data);
  },
  // TESTED
  round_end: (data) => {
    if (!window.location.pathname.startsWith('/tournament')) {
      showTournamentAlert(data.tournament_id, TOURNAMENT_ALERT_TYPE.ROUND_END);
    }
  },
});
