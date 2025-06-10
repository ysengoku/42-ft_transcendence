export const MAX_CHAT_MESSAGE_LENGTH = Number(import.meta.env.VITE_MAX_MESSAGE_LENGTH) || 255;

export const DEFAULT_AVATAR = import.meta.env.VITE_DEFAULT_AVATAR || '/img/default_avatar.png';

export const DEFAULT_GAME_OPTIONS = import.meta.env.VITE_DEFAULT_GAME_OPTIONS || {
  scoreToWin: 5,
  gameSpeed: 'medium',
  ranked: false,
  timeLimit: 3,
  coolMode: false,
};

export const MAX_TOURNAMENT_NAME_LENGTH = Number(import.meta.env.VITE_MAX_TOURNAMENT_NAME_LENGTH) || 50;

export const MAX_TOURNAMENT_ALIAS_LENGTH = Number(import.meta.env.VITE_MAX_TOURNAMENT_ALIAS_LENGTH) || 12;

export const REQUIRED_PARTICIPANTS_OPTIONS = import.meta.env.VITE_REQUIRED_PARTICIPANTS_OPTIONS || '4, 8';
