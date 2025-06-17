import { isEqual } from '../../src/js/utils/isEqual';

describe('isEqual function', () => {
  test('returns true for two null values', () => {
    expect(isEqual(null, null)).toBe(true);
  });

  test('returns false for null and non null', () => {
    expect(isEqual(null, undefined)).toBe(false);
    expect(isEqual(null, 5)).toBe(false);
    expect(isEqual(null, 'test')).toBe(false);
    expect(isEqual(null, {})).toBe(false);
  });

  test('returns true for two identical primitive values', () => {
    expect(isEqual(5, 5)).toBe(true);
    expect(isEqual('test', 'test')).toBe(true);
  });

  test('returns false for different primitive values', () => {
    expect(isEqual(5, 10)).toBe(false);
    expect(isEqual('test', 'TEST')).toBe(false);
  });

  test('returns true for two identical arrays', () => {
    expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  test('returns false for arrays of different lengths', () => {
    expect(isEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(isEqual([1, 2, 3], [1, 2])).toBe(false);
  });

  test('returns false for arrays with different elements', () => {
    expect(isEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(isEqual([1, 2, 3], [1, 3, 2])).toBe(false);
  });

  test('returns true for two identical objects', () => {
    expect(isEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  test('returns false for objects with different keys', () => {
    expect(isEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(isEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });

  test('returns false for objects with different values', () => {
    expect(isEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
    expect(isEqual({ a: 1, b: 2 }, { a: 2, b: 1 })).toBe(false);
  });

  test('returns true for deeply nested identical objects', () => {
    const obj1 = { a: { b: { c: 1 } } };
    const obj2 = { a: { b: { c: 1 } } };
    expect(isEqual(obj1, obj2)).toBe(true);
  });

  test('returns false for deeply nested different objects', () => {
    const obj1 = { a: { b: { c: 1 } } };
    const obj2 = { a: { b: { c: 2 } } };
    expect(isEqual(obj1, obj2)).toBe(false);
  });

  test('returns true for empty objects and arrays', () => {
    expect(isEqual({}, {})).toBe(true);
    expect(isEqual([], [])).toBe(true);
  });
});
