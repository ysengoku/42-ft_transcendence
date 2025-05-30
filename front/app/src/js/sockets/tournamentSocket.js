import { socketManager } from '@socket';
import { router } from '@router';

// Socket registration for tournament
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
    // Show a toast notification
  },
  round_start: (data) => {
    // If the current page is a tournament page, call roundStart method
    // If not, redirect to the tournament page
  },
  match_finished: (data) => {
    // Show alert message for match finished?
    router.redirect(`tournament/${data.tournament_id}`);
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
      router.redirect(`tournament/${data.tournament_id}`);
    }
  },
  tournament_end: (data) => {
    // Show a toast notification
    router.redirect(`tournament/${data.tournament_id}`);
  },
});
