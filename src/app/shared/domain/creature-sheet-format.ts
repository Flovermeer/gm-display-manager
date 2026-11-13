/**
 * Libellés de fiche de créature partagés par les PNJ et le bestiaire.
 * Une valeur absente est affichée avec un tiret cadratin.
 */

const MISSING_VALUE = '—';

export function abilityModifier(score: number | null): string {
  if (score === null) return MISSING_VALUE;
  const modifier = Math.floor((score - 10) / 2);
  return `${modifier >= 0 ? '+' : ''}${modifier}`;
}

export function abilityScoreWithModifier(score: number | null): string {
  if (score === null) return MISSING_VALUE;
  return `${score} (${abilityModifier(score)})`;
}

export function armorClassLabel(
  sheet: Readonly<{ armorClass: number | null; armorClassDetails: string }>,
): string {
  if (sheet.armorClass === null) return MISSING_VALUE;
  return sheet.armorClassDetails
    ? `${sheet.armorClass} (${sheet.armorClassDetails})`
    : String(sheet.armorClass);
}

export function hitPointsLabel(
  sheet: Readonly<{ hitPoints: number | null; hitPointFormula: string }>,
): string {
  if (sheet.hitPoints === null) return MISSING_VALUE;
  return sheet.hitPointFormula
    ? `${sheet.hitPoints} (${sheet.hitPointFormula})`
    : String(sheet.hitPoints);
}

export function challengeLabel(
  sheet: Readonly<{ challengeRating: string; experiencePoints: number | null }>,
): string {
  if (!sheet.challengeRating && sheet.experiencePoints === null) return MISSING_VALUE;
  const experience =
    sheet.experiencePoints === null
      ? ''
      : ` (${new Intl.NumberFormat('fr-FR').format(sheet.experiencePoints)} PX)`;
  return `${sheet.challengeRating || MISSING_VALUE}${experience}`;
}
