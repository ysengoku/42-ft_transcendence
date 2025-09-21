/**
 * Socket registration for tournament with events handlers.
 */
import { router } from '@router';
import { socketManager } from '@socket';
import { showToastNotification, TOAST_TYPES } from '@utils';
import { showTournamentAlert, TOURNAMENT_ALERT_TYPE } from '@components/pages/tournament/utils/tournamentAlert';

socketManager.addSocket('tournament', {
  new_registration: (data) => {
    log.info('New tournament registration:', data);
    if (window.location.pathname.startsWith('/tournament')) {
      const tournamentPendingContentElement = document.querySelector('tournament-pending');
      tournamentPendingContentElement?.addParticipant(data);
    }
  },
  registration_canceled: (data) => {
    log.info('Tournament registration canceled:', data);
    if (window.location.pathname.startsWith('/tournament')) {
      const tournamentPendingContentElement = document.querySelector('tournament-pending');
      tournamentPendingContentElement?.removeParticipant(data);
    }
  },
  tournament_canceled: (data) => {
    log.info('Tournament canceled:', data);
    if (window.location.pathname.startsWith('/tournament')) {
      const tournamentPageElement = document.querySelector('tournament-room');
      tournamentPageElement?.handleTournamentCanceled(data);
    } else {
      showToastNotification(`Tournament -  ${data.tournament_name} has been canceled.`, TOAST_TYPES.ERROR);
    }
  },
  tournament_start: (data) => {
    log.info('Tournament starts:', data);
    if (
      window.location.pathname.startsWith('/tournament') ||
      window.location.pathname.startsWith('/multiplayer-game')
    ) {
      const tournamentPage = document.querySelector('tournament-room');
      tournamentPage?.handleTournamentStart(data);
    } else {
      showTournamentAlert(data.tournament_id, TOURNAMENT_ALERT_TYPE.TOURNAMENT_STARTS, data.tournament_name);
    }
  },
  round_start: (data) => {
    if (window.location.pathname.startsWith('/multiplayer-game')) {
      router.redirect('/tournament/' + data.tournament_id);
    }
    if (window.location.pathname.startsWith('/tournament')) {
      const tournamentPage = document.querySelector('tournament-room');
      tournamentPage?.setNextRound(data);
    }
  },
  match_result: async (data) => {
    if (!window.location.pathname.startsWith('/tournament')) {
      return;
    }
    const tournamentPage = document.querySelector('tournament-room');
    tournamentPage?.updateMatchResult(data);
  },
  round_end: (data) => {
    if (
      !window.location.pathname.startsWith('/tournament') &&
      !window.location.pathname.startsWith('/multiplayer-game')
    ) {
      showTournamentAlert(data.tournament_id, TOURNAMENT_ALERT_TYPE.ROUND_END);
    }
  },
});
