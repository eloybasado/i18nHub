import {
  collectAllNodePaths,
  extractInterpolationVars,
  findMisnestedKey,
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

  describe('collectAllNodePaths', () => {
    it('includes leaf, intermediate, and empty-container paths', () => {
      const result = collectAllNodePaths({
        nav: { home: 'Home', about: 'About' },
        empty: {},
        list: [],
      });

      expect(result.has('nav')).toBe(true);
      expect(result.has('nav.home')).toBe(true);
      expect(result.has('nav.about')).toBe(true);
      expect(result.has('empty')).toBe(true);
      expect(result.has('list')).toBe(true);
    });

    it('includes array index paths', () => {
      const result = collectAllNodePaths({ items: ['a', 'b'] });

      expect(result.has('items')).toBe(true);
      expect(result.has('items.0')).toBe(true);
      expect(result.has('items.1')).toBe(true);
    });
  });

  describe('findMisnestedKey', () => {
    it('returns the only target key that shares the same leaf name', () => {
      const result = findMisnestedKey(
        'home.title',
        new Set(['title', 'nav.home']),
      );

      expect(result).toBe('title');
    });

    it('returns null when there is no unique misnested match', () => {
      expect(
        findMisnestedKey('home.title', new Set(['nav.title', 'title'])),
      ).toBeNull();
    });
  });
});
