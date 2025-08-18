export const MAX_NAME_LENGTH = Number(import.meta.env.VITE_MAX_NAME_LENGTH) || 50;
export const MIN_PASSWORD_LENGTH = Number(import.meta.env.VITE_MIN_PASSWORD_LENGTH) || 8;

export const MAX_CHAT_MESSAGE_LENGTH = Number(import.meta.env.VITE_MAX_MESSAGE_LENGTH) || 255;

export const DEFAULT_AVATAR = import.meta.env.VITE_DEFAULT_AVATAR || '/img/default_avatar.png';

export const MAX_TOURNAMENT_NAME_LENGTH = Number(import.meta.env.VITE_MAX_TOURNAMENT_NAME_LENGTH) || 50;

export const MAX_TOURNAMENT_ALIAS_LENGTH = Number(import.meta.env.VITE_MAX_TOURNAMENT_ALIAS_LENGTH) || 12;

export const REQUIRED_PARTICIPANTS_OPTIONS = import.meta.env.VITE_REQUIRED_PARTICIPANTS_OPTIONS || '4, 8';

let defaultGameOptions = {
  score_to_win: 5,
  game_speed: 'medium',
  ranked: false,
  time_limit: 3,
  cool_mode: false,
};
const defaultGameOptionsFromEnv = import.meta.env.VITE_DEFAULT_GAME_OPTIONS;
if (defaultGameOptionsFromEnv) {
  try {
    defaultGameOptions = JSON.parse(defaultGameOptionsFromEnv);
  } catch (error) {
    log.error('Invalid JSON format for VITE_DEFAULT_GAME_OPTIONS:', error);
  }
}
export const DEFAULT_GAME_OPTIONS = defaultGameOptions;
