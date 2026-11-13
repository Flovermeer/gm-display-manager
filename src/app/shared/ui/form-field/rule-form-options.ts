import type { FormFieldOption } from '@app/shared/ui/form-field/form-field';

type RuleOption = Readonly<{ id: string; label: string; code: string }>;

/** Options d’un référentiel ; une ancienne valeur libre absente du référentiel reste sélectionnable. */
export function ruleFormOptions(
  options: readonly RuleOption[],
  legacyLabel = '',
): readonly FormFieldOption[] {
  const normalized = legacyLabel.trim().toLocaleLowerCase('fr');
  const mapped = options.some(
    ({ label, code }) =>
      label.toLocaleLowerCase('fr') === normalized || code.toLocaleLowerCase('fr') === normalized,
  );
  return [
    ...options.map(({ id, label }) => ({ value: id, label })),
    ...(legacyLabel && !mapped
      ? [{ value: legacyLabel, label: `${legacyLabel} (ancienne valeur)` }]
      : []),
  ];
}

/** Identifiant de l’option sélectionnée, ou null si la valeur est un ancien libellé libre. */
export function knownOptionId(value: string, options: readonly { id: string }[]): string | null {
  return options.some(({ id }) => id === value) ? value : null;
}
