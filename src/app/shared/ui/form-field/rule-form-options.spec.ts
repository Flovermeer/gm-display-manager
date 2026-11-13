import { knownOptionId, ruleFormOptions } from '@app/shared/ui/form-field/rule-form-options';

describe('ruleFormOptions', () => {
  const options = [{ id: 'elf', code: 'elf', label: 'Elfe' }];

  it('keeps an unknown legacy value selectable', () => {
    expect(ruleFormOptions(options, 'Elfe')).toEqual([{ value: 'elf', label: 'Elfe' }]);
    expect(ruleFormOptions(options, 'Tieffelin')).toEqual([
      { value: 'elf', label: 'Elfe' },
      { value: 'Tieffelin', label: 'Tieffelin (ancienne valeur)' },
    ]);
  });

  it('only returns an identifier that exists in the catalog', () => {
    expect(knownOptionId('elf', options)).toBe('elf');
    expect(knownOptionId('Tieffelin', options)).toBeNull();
  });
});
