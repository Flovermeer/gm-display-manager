import type { PlayerDisplayStateOf } from '@app/features/display/domain/player-display-state';
import {
  createEmptyRichTextDocument,
  type RichTextDocument,
} from '@app/shared/rich-text-editor/rich-text-document';
import type { ResourceProvenance } from '@app/shared/domain/resource-provenance';

export const NARRATIVE_ITEM_STATUSES = ['active', 'lost', 'destroyed', 'retired'] as const;
export type NarrativeItemStatus = (typeof NARRATIVE_ITEM_STATUSES)[number];
export const ATTUNEMENT_MODES = ['none', 'required', 'conditional'] as const;
export type AttunementMode = (typeof ATTUNEMENT_MODES)[number];
export type ItemOwnerType = 'npc' | 'location' | 'player-character';
export type ItemOwner = Readonly<{ resourceType: ItemOwnerType; resourceId: string }>;

export type NarrativeItem = Readonly<{
  id: string;
  campaignId: string;
  provenance: ResourceProvenance;
  itemTypeId: string;
  itemRarityId: string | null;
  owner: ItemOwner | null;
  name: string;
  status: NarrativeItemStatus;
  attunement: AttunementMode;
  attunementCondition: string;
  summary: string;
  description: RichTextDocument;
  imagePath: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type UpdateNarrativeItemInput = Readonly<{
  itemTypeId: string;
  itemRarityId: string | null;
  owner: ItemOwner | null;
  name: string;
  status: NarrativeItemStatus;
  attunement: AttunementMode;
  attunementCondition: string;
  summary: string;
  description: RichTextDocument;
}>;

export function emptyNarrativeItemInput(): UpdateNarrativeItemInput {
  return {
    itemTypeId: '',
    itemRarityId: null,
    owner: null,
    name: '',
    status: 'active',
    attunement: 'none',
    attunementCondition: '',
    summary: '',
    description: createEmptyRichTextDocument(),
  };
}

export function createNarrativeItem(
  campaignId: string,
  input: UpdateNarrativeItemInput,
  imagePath: string | null = null,
  createId: () => string = () => crypto.randomUUID(),
  now: () => Date = () => new Date(),
): NarrativeItem {
  const timestamp = now().toISOString();
  return {
    id: createId(),
    campaignId,
    provenance: 'campaign',
    ...normalizeInput(input),
    imagePath,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateNarrativeItem(
  item: NarrativeItem,
  input: UpdateNarrativeItemInput,
  imagePath: string | null = item.imagePath,
  now: () => Date = () => new Date(),
): NarrativeItem {
  return { ...item, ...normalizeInput(input), imagePath, updatedAt: now().toISOString() };
}

function normalizeInput(input: UpdateNarrativeItemInput): UpdateNarrativeItemInput {
  const name = input.name.trim();
  if (!name) throw new Error('Narrative item name is required.');
  if (!input.itemTypeId) throw new Error('Narrative item type is required.');
  if (input.attunement === 'conditional' && !input.attunementCondition.trim()) {
    throw new Error('Conditional attunement requires a condition.');
  }
  return {
    ...input,
    name,
    summary: input.summary.trim(),
    attunementCondition: input.attunement === 'conditional' ? input.attunementCondition.trim() : '',
  };
}

export function itemPlayerDisplayState(
  item: Pick<NarrativeItem, 'id' | 'name' | 'summary'>,
  imageUrl: string,
): PlayerDisplayStateOf<'item'> {
  return {
    mode: 'item',
    itemId: item.id,
    name: item.name,
    summary: item.summary,
    imagePath: imageUrl,
  };
}
