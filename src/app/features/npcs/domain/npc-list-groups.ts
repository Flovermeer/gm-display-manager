import type { Npc, NpcKind } from '@app/features/npcs/domain/npc';

export type NpcListGroup = Readonly<{
  kind: NpcKind;
  label: string;
  npcs: readonly Npc[];
}>;

/** Les organisations sont listées avant les personnages. */
const NPC_LIST_GROUP_ORDER: readonly NpcKind[] = ['organization', 'character'];

const NPC_LIST_GROUP_LABELS: Readonly<Record<NpcKind, string>> = {
  organization: 'Organisation',
  character: 'PNJ',
};

/** Répartit les PNJ par type en conservant leur ordre ; les groupes vides sont omis. */
export function groupNpcsByKind(npcs: readonly Npc[]): readonly NpcListGroup[] {
  return NPC_LIST_GROUP_ORDER.map((kind) => ({
    kind,
    label: NPC_LIST_GROUP_LABELS[kind],
    npcs: npcs.filter((npc) => npc.kind === kind),
  })).filter((group) => group.npcs.length > 0);
}
