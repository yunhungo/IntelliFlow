import { describe, expect, it } from 'vitest';
import { nextEnabledOption, type SwitchOption, withSelectedOption } from './switching';

const options: SwitchOption[] = [
  { id: 'a', label: 'A', selected: false },
  { id: 'b', label: 'B', selected: true },
  { id: 'c', label: 'C', selected: false, disabled: true },
];

describe('switching helpers', () => {
  it('cycles enabled options and wraps around', () => {
    expect(nextEnabledOption(options)?.id).toBe('a');
    expect(nextEnabledOption(options, 'a')?.id).toBe('b');
  });

  it('marks exactly one option as selected', () => {
    expect(withSelectedOption(options, 'a').map((option) => option.selected)).toEqual([
      true,
      false,
      false,
    ]);
  });
});
