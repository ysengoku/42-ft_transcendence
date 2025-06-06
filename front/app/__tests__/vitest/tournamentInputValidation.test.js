import { describe, it, expect } from 'vitest';
import {
  validateTournamentName,
  validateTournamentAlias,
} from '@components/pages/tournament/utils/validateInput.js';
import {
  MAX_TOURNAMENT_NAME_LENGTH,
  MAX_TOURNAMENT_ALIAS_LENGTH,
} from '@env';

describe('Validate Tournament Input', () => {
  it('should return error if name is empty', () => {
    expect(validateTournamentName('')).toBe('Tournament name cannot be empty');
  });

  it('should return error if name exceeds max length', () => {
    const longName = 'a'.repeat(MAX_TOURNAMENT_NAME_LENGTH + 1);
    expect(validateTournamentName(longName)).toBe(
      `Tournament name cannot exceed ${MAX_TOURNAMENT_NAME_LENGTH} characters`
    );
  });

  it('should return empty string for valid name', () => {
    const validName = 'Valid Tournament';
    expect(validateTournamentName(validName)).toBe('');
  });
});

describe('validateTournamentAlias', () => {
  it('should return error if alias is empty', () => {
    expect(validateTournamentAlias('')).toBe('Alias cannot be empty');
  });

  it('should return error if alias exceeds max length', () => {
    const longAlias = 'a'.repeat(MAX_TOURNAMENT_ALIAS_LENGTH + 1);
    expect(validateTournamentAlias(longAlias)).toBe(
      `Alias cannot exceed ${MAX_TOURNAMENT_ALIAS_LENGTH} characters`
    );
  });

  it('should return error if alias contains invalid characters', () => {
    const invalidAlias = 'bad*alias!';
    expect(validateTournamentAlias(invalidAlias)).toBe(
      'Alias can contain only letters, numbers and _ . @ + -'
    );
  });

  it('should allow only letters, numbers, and _ . @ + -', () => {
    const validAliases = [
      'user_name',
      'user.name',
      'user@name',
      'user+name',
      'user-name',
      'User123',
    ];
    for (const alias of validAliases) {
      expect(validateTournamentAlias(alias)).toBe('');
    }
  });
});
