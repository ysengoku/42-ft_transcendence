import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getOptionsFromLocalStorage,
  validateStoredOptions,
  validateOption,
} from '@components/pages/match/utils/gameOptions.js';
import { DEFAULT_GAME_OPTIONS } from '@env';

describe('validateStoredOptions', () => {
  const defaultValues = {
    score_to_win: DEFAULT_GAME_OPTIONS.score_to_win || 5,
    game_speed: DEFAULT_GAME_OPTIONS.game_speed || 'medium',
    time_limit: DEFAULT_GAME_OPTIONS.time_limit || 3,
    ranked: DEFAULT_GAME_OPTIONS.ranked || false,
    cool_mode: DEFAULT_GAME_OPTIONS.cool_mode || false,
  };

  it('should return valid options unchanged', () => {
    const validOptions = {
      score_to_win: 10,
      game_speed: 'fast',
      time_limit: 2,
      ranked: true,
      cool_mode: false,
    };

    const result = validateStoredOptions(validOptions);
    expect(result).toEqual(validOptions);
  });

  it('should fallback to default for invalid number range', () => {
    const options = {
      score_to_win: 100, // invalid
      game_speed: 'medium',
      time_limit: 2,
      ranked: true,
      cool_mode: false,
    };

    const result = validateStoredOptions(options);
    expect(result.score_to_win).toEqual(defaultValues.score_to_win);
  });

  it('should fallback to default for invalid enum value', () => {
    const options = {
      score_to_win: 5,
      game_speed: 'ultra-fast', // invalid
      time_limit: 2,
      ranked: true,
      cool_mode: false,
    };

    const result = validateStoredOptions(options);
    expect(result.game_speed).toEqual(defaultValues.game_speed);
  });

  it('should fallback to default for missing fields', () => {
    const options = {
      score_to_win: 5,
    };

    const result = validateStoredOptions(options);
    expect(result.cool_mode).toEqual(defaultValues.cool_mode);
    expect(result.ranked).toEqual(defaultValues.ranked);
    expect(result.time_limit).toEqual(defaultValues.time_limit);
    expect(result.game_speed).toEqual(defaultValues.game_speed);
  });
});

describe('validateOption', () => {
  it('validates boolean type', () => {
    expect(validateOption(true, { type: 'boolean' })).toBe(true);
    expect(validateOption('any', { type: 'boolean' })).toBe(true);
    expect(validateOption('true', { type: 'boolean' })).toBe(false);
  });

  it('validates enum type', () => {
    const rule = { type: 'enum', values: ['slow', 'medium', 'fast', 'any'] };
    expect(validateOption('medium', rule)).toBe(true);
    expect(validateOption('ultra', rule)).toBe(false);
    expect(validateOption('any', rule)).toBe(true);
  });

  it('validates number with range', () => {
    const rule = { type: 'number', min: 1, max: 5 };
    expect(validateOption(3, rule)).toBe(true);
    expect(validateOption(0, rule)).toBe(false);
    expect(validateOption('3', rule)).toBe(false);
    expect(validateOption('any', rule)).toBe(true);
  });

  it('returns undefined for unknown type', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(validateOption('x', { type: 'unknown' })).toBeUndefined();
    expect(spy).toHaveBeenCalledWith('Unknown validation rule type: unknown');
    spy.mockRestore();
  });
});

describe('getOptionsFromLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null if no localStorage entry', () => {
    expect(getOptionsFromLocalStorage()).toBeNull();
  });

  it('returns null if JSON is malformed', () => {
    localStorage.setItem('gameOptions', '{ invalid json ');
    expect(getOptionsFromLocalStorage()).toBeNull();
  });

  it('returns validated options from localStorage', () => {
    const stored = {
      score_to_win: 7,
      game_speed: 'fast',
      time_limit: 2,
      ranked: false,
      cool_mode: true,
    };
    localStorage.setItem('gameOptions', JSON.stringify(stored));
    const result = getOptionsFromLocalStorage();
    expect(result).toEqual(stored);
  });
});
