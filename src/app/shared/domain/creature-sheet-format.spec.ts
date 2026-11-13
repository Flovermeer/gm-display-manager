import {
  abilityModifier,
  abilityScoreWithModifier,
  armorClassLabel,
  challengeLabel,
  hitPointsLabel,
} from '@app/shared/domain/creature-sheet-format';

describe('creature sheet format', () => {
  it('formats ability modifiers with their sign', () => {
    expect(abilityModifier(8)).toBe('-1');
    expect(abilityModifier(10)).toBe('+0');
    expect(abilityModifier(15)).toBe('+2');
    expect(abilityModifier(null)).toBe('—');
    expect(abilityScoreWithModifier(15)).toBe('15 (+2)');
    expect(abilityScoreWithModifier(null)).toBe('—');
  });

  it('adds armor and hit point details only when they exist', () => {
    expect(armorClassLabel({ armorClass: 15, armorClassDetails: 'armure de cuir' })).toBe(
      '15 (armure de cuir)',
    );
    expect(armorClassLabel({ armorClass: 12, armorClassDetails: '' })).toBe('12');
    expect(armorClassLabel({ armorClass: null, armorClassDetails: '' })).toBe('—');
    expect(hitPointsLabel({ hitPoints: 27, hitPointFormula: '5d8 + 5' })).toBe('27 (5d8 + 5)');
    expect(hitPointsLabel({ hitPoints: null, hitPointFormula: '' })).toBe('—');
  });

  it('formats the challenge with French experience points', () => {
    expect(challengeLabel({ challengeRating: '5', experiencePoints: 1800 })).toBe(
      `5 (${new Intl.NumberFormat('fr-FR').format(1800)} PX)`,
    );
    expect(challengeLabel({ challengeRating: '1/4', experiencePoints: null })).toBe('1/4');
    expect(challengeLabel({ challengeRating: '', experiencePoints: null })).toBe('—');
  });
});
