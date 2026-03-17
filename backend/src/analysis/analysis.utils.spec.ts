import {
  extractInterpolationVars,
  flattenJsonToMap,
  hasInterpolationMismatch,
} from './analysis.utils';

describe('analysis.utils', () => {
  it('flattens nested objects and arrays into dot notation keys', () => {
    const input = {
      home: {
        title: 'Welcome',
      },
      nav: {
        items: ['one', 'two'],
      },
    };

    const result = flattenJsonToMap(input);

    expect(Array.from(result.entries())).toEqual([
      ['home.title', 'Welcome'],
      ['nav.items.0', 'one'],
      ['nav.items.1', 'two'],
    ]);
  });

  it('keeps primitive values represented as strings', () => {
    const input = {
      flags: {
        active: true,
        count: 3,
      },
      nullable: null,
    };

    const result = flattenJsonToMap(input);

    expect(result.get('flags.active')).toBe('true');
    expect(result.get('flags.count')).toBe('3');
    expect(result.get('nullable')).toBe('null');
  });

  it('extracts unique sorted interpolation variables', () => {
    const result = extractInterpolationVars(
      'Hello {userName}, {count} items for {userName}',
    );

    expect(result).toEqual(['count', 'userName']);
  });

  it('detects interpolation mismatch when variables differ', () => {
    expect(
      hasInterpolationMismatch('Hello {userName}', 'Hola {user_name}'),
    ).toBe(true);
  });

  it('does not report mismatch when variables match', () => {
    expect(
      hasInterpolationMismatch('Hello {userName}', 'Hola {userName}'),
    ).toBe(false);
  });
});