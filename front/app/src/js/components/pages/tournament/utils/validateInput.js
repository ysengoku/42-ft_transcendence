import {
  MAX_TOURNAMENT_ALIAS_LENGTH,
  MAX_TOURNAMENT_NAME_LENGTH,
} from '@env';

export function validateTournamentName(name) {
  if (name.length === 0) {
	return 'Tournament name cannot be empty';
  }
  if (name.length > MAX_TOURNAMENT_NAME_LENGTH) {
	return `Tournament name cannot exceed ${MAX_TOURNAMENT_NAME_LENGTH} characters`;
  }
  return '';
}

export function validateTournamentAlias(alias) {
  if (alias.length === 0) {
	return 'Alias cannot be empty';
  }
  if (alias.length > MAX_TOURNAMENT_ALIAS_LENGTH) {
	return `Alias cannot exceed ${MAX_TOURNAMENT_ALIAS_LENGTH} characters`;
  }
  const regex = /^[\w.@+-]+$/;
  if (!regex.test(alias)) {
    return 'Alias can contain only letters, numbers and _ . @ + -';
  }
  return '';
}
