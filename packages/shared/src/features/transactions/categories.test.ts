import { describe, expect, it } from 'vitest';
import { sortCategoriesForSelect } from './categories';

describe('sortCategoriesForSelect', () => {
  const categories = [
    { key: 'Other', name: 'Other' },
    { key: 'Groceries', name: 'Groceries' },
    { key: 'custom:1', name: 'Zoo' },
    { key: 'Alcohol', name: 'Alcohol' },
    { key: 'custom:2', name: 'Books' },
  ];

  it('sorts alphabetically by label and keeps Other last', () => {
    const sorted = sortCategoriesForSelect(categories, (category) => category.name, 'en');

    expect(sorted.map((category) => category.key)).toEqual([
      'Alcohol',
      'custom:2',
      'Groceries',
      'custom:1',
      'Other',
    ]);
  });

  it('keeps Other last even when its label would sort earlier', () => {
    const sorted = sortCategoriesForSelect(
      [
        { key: 'Other', name: 'Aaa' },
        { key: 'Health', name: 'Zzz' },
      ],
      (category) => category.name,
      'en'
    );

    expect(sorted.map((category) => category.key)).toEqual(['Health', 'Other']);
  });
});
