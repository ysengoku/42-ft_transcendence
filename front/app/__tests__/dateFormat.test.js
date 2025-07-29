import { describe, it, expect } from 'vitest';
import { getRelativeTime, getRelativeDateAndTime, formatDateMDY } from '../src/js/utils/dateFormat.js';

describe('getRelativeTime', () => {
  it('returns "now" for less than 1 minute ago', () => {
    expect(getRelativeTime(new Date())).toBe('now');
  });

  it('returns minutes ago', () => {
    const date = new Date(Date.now() - 5 * 60000);
    expect(getRelativeTime(date)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    const date = new Date(Date.now() - 2 * 3600000);
    expect(getRelativeTime(date)).toBe('2h ago');
  });

  it('returns "yesterday" for 1 day ago', () => {
    const date = new Date(Date.now() - 24 * 3600000);
    expect(getRelativeTime(date)).toBe('yesterday');
  });

  it('returns "2 days ago" for 2 days ago', () => {
    const date = new Date(Date.now() - 2 * 24 * 3600000);
    expect(getRelativeTime(date)).toBe('2 days ago');
  });

  it('returns formatted date for older dates', () => {
    const date = new Date('2020-01-01T12:00:00Z');
    expect(getRelativeTime(date)).toMatch(/\w{3} \d{1,2}/);
  });
});

describe('getRelativeDateAndTime', () => {
  it('returns "today, ..." for today', () => {
    const now = new Date();
    expect(getRelativeDateAndTime(now)).toMatch(/^today, /);
  });

  it('returns "yesterday, ..." for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(getRelativeDateAndTime(yesterday)).toMatch(/^yesterday, /);
  });

  it('returns formatted date and time for older dates', () => {
    const date = new Date('2020-01-01T15:30:00Z');
    expect(getRelativeDateAndTime(date)).toMatch(/, \d{2}:\d{2}/);
  });
});

describe('formatDateMDY', () => {
  it('formats date as "MMM d, yyyy"', () => {
    const date = new Date('2020-01-01T00:00:00Z');
    expect(formatDateMDY(date)).toMatch(/\w{3} \d{1,2}, 2020/);
  });
});
