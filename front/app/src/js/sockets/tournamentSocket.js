import { socketManager } from "./socket";

// Socket registration for tournament
const tournamentEvents = [
  { action: 'tournament_cancelled', event: 'tournamentCancelled' },
  { action: 'new_registration', event: 'newTournamentRegistration' },
  { action: 'registration_cancelled', event: 'tournamentRegistrationCancelled' },
  { action: 'round_start', event: 'tournamentRoundStart' },
  { action: 'match_finished', event: 'tournamentMatchFinished' }, // TODO: Automatically navigate to the tournament page
  { action: 'matchResult', event: 'tournamentMatchResult' },
  { action: 'round_end', event: 'tournamentRoundEnd' },
  { action: 'tournament_end', event: 'tournamentEnd' },
];

const tournamentListeners = tournamentEvents.reduce((acc, { action, event }) => {
  acc[action] = (data) => {
    const customEvent = new CustomEvent(event, { detail: data, bubbles: true });
    document.dispatchEvent(customEvent);
  };
  return acc;
}, {});

socketManager.addSocket('tournament', tournamentListeners);
