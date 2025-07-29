import { DEFAULT_GAME_OPTIONS } from '@env';

const defaultOptionValue = {
  score_to_win: DEFAULT_GAME_OPTIONS.score_to_win || 5,
  game_speed: DEFAULT_GAME_OPTIONS.game_speed || 'medium',
  time_limit: DEFAULT_GAME_OPTIONS.time_limit || 3,
  ranked: DEFAULT_GAME_OPTIONS.ranked || false,
  cool_mode: DEFAULT_GAME_OPTIONS.cool_mode || false,
};

const range = {
  minScoreToWin: 3,
  maxScoreToWin: 20,
  minTimeLimit: 1,
  maxTimeLimit: 5,
};

const gameOptionsSchema = {
  cool_mode: { type: 'boolean' },
  ranked: { type: 'boolean' },
  game_speed: {
    type: 'enum',
    values: ['slow', 'medium', 'fast', 'any'],
  },
  score_to_win: {
    type: 'number',
    min: range.minScoreToWin,
    max: range.maxScoreToWin,
  },
  time_limit: {
    type: 'number',
    min: range.minTimeLimit,
    max: range.maxTimeLimit,
  },
};

export function getOptionsFromLocalStorage() {
  const storedOptions = localStorage.getItem('gameOptions');
  let options = null;
  if (storedOptions) {
    try {
      options = JSON.parse(storedOptions);
    } catch {
      devErrorLog('Invalid format of Game options');
      options = null;
    }
  }
  if (!options) {
    return null;
  }
  return validateStoredOptions(options);
}

export function validateStoredOptions(options = {}) {
  const validatedOtions = {};
  for (const [key, rule] of Object.entries(gameOptionsSchema)) {
    if (options[key] === undefined || options[key] === null) {
      validatedOtions[key] = defaultOptionValue[key];
    } else if (validateOption(options[key], rule)) {
      validatedOtions[key] = options[key];
    } else {
      validatedOtions[key] = defaultOptionValue[key];
    }
  }
  return validatedOtions;
}

export function validateOption(raw, rule) {
  switch (rule.type) {
    case 'boolean':
      return typeof raw === 'boolean' || raw === 'any';
    case 'enum':
      return rule.values.includes(raw);
    case 'number':
      return raw === 'any' || (typeof raw === 'number' && raw >= rule.min && raw <= rule.max);
    default:
      devErrorLog(`Unknown validation rule type: ${rule.type}`);
  }
}
