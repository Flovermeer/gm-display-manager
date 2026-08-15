import type { RichTextFeature } from '@app/shared/ui/rich-text-feature-editor/rich-text-feature-editor';

export const CREATURE_FEATURE_SECTIONS = [
  { key: 'traits', label: 'Capacités', singularLabel: 'une capacité' },
  { key: 'actions', label: 'Actions', singularLabel: 'une action' },
  { key: 'bonusActions', label: 'Actions bonus', singularLabel: 'une action bonus' },
  { key: 'reactions', label: 'Réactions', singularLabel: 'une réaction' },
  {
    key: 'legendaryActions',
    label: 'Actions légendaires',
    singularLabel: 'une action légendaire',
  },
] as const;

export type CreatureFeatureSection = (typeof CREATURE_FEATURE_SECTIONS)[number]['key'];
export type CreatureFeatureDrafts = Readonly<
  Record<CreatureFeatureSection, readonly RichTextFeature[]>
>;

export function emptyCreatureFeatureDrafts(): CreatureFeatureDrafts {
  return {
    traits: [],
    actions: [],
    bonusActions: [],
    reactions: [],
    legendaryActions: [],
  };
}

export function creatureFeatureDraftsFrom(source: CreatureFeatureDrafts): CreatureFeatureDrafts {
  return {
    traits: source.traits,
    actions: source.actions,
    bonusActions: source.bonusActions,
    reactions: source.reactions,
    legendaryActions: source.legendaryActions,
  };
}
