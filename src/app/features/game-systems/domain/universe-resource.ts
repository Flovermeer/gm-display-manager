import type { MonsterSheet } from '@app/features/bestiary/domain/monster';
import type { AttunementMode } from '@app/features/items/domain/narrative-item';
import type { Location } from '@app/features/locations/domain/location';
import type { NpcSheet } from '@app/features/npcs/domain/npc';
import type { PlayerCharacterSheet } from '@app/features/players/domain/player-character';
import type { RichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';

export const UNIVERSE_RESOURCE_TYPES = [
  'npc',
  'player-character',
  'location',
  'item',
  'monster',
] as const;

export type UniverseResourceType = (typeof UNIVERSE_RESOURCE_TYPES)[number];

export type UniverseResourceSummary = Readonly<{
  id: string;
  universeId: string;
  type: UniverseResourceType;
  name: string;
  summary: string;
  campaignCount: number;
  deletedAt: string | null;
}>;

type UniverseResourceDetailBase<TType extends UniverseResourceType> = Readonly<{
  id: string;
  universeId: string;
  type: TType;
  name: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type UniverseNpcDetail = UniverseResourceDetailBase<'npc'> &
  Readonly<{
    portraitPath: string | null;
    idleVideoPath: string | null;
    sheet: NpcSheet;
  }>;

export type UniversePlayerCharacterDetail = UniverseResourceDetailBase<'player-character'> &
  Readonly<{
    maxHitPoints: number | null;
    portraitPath: string | null;
    sheet: PlayerCharacterSheet;
  }>;

export type UniverseLocationDetail = UniverseResourceDetailBase<'location'> &
  Pick<Location, 'parentLocationId' | 'summary' | 'imagePath'>;

export type UniverseNarrativeItemDetail = UniverseResourceDetailBase<'item'> &
  Readonly<{
    itemTypeId: string;
    itemRarityId: string | null;
    attunement: AttunementMode;
    attunementCondition: string;
    summary: string;
    description: RichTextDocument;
    imagePath: string | null;
  }>;

export type UniverseMonsterDetail = UniverseResourceDetailBase<'monster'> &
  Readonly<{
    imagePath: string | null;
    sheet: MonsterSheet;
  }>;

export type UniverseResourceDetail =
  | UniverseNpcDetail
  | UniversePlayerCharacterDetail
  | UniverseLocationDetail
  | UniverseNarrativeItemDetail
  | UniverseMonsterDetail;

export type UniverseResourceDetailFor<TType extends UniverseResourceType> = Extract<
  UniverseResourceDetail,
  Readonly<{ type: TType }>
>;
