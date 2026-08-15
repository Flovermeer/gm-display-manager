/**
 * But
 * Conserve les PJ et leur état de campagne en mémoire hors de Tauri.
 *
 * Responsabilités
 * - sert au navigateur et aux tests ;
 * - reproduit le partage canonique, les snapshots et l'état local des PJ.
 */

import type {
  PlayerCharacter,
  PlayerCharacterStatus,
} from '@app/features/players/domain/player-character';
import { PlayerCharacterRepository } from '@app/features/players/data-access/player-character.repository';

type CampaignState = Readonly<{
  playerName: string;
  status: PlayerCharacterStatus;
  currentHitPoints: number | null;
  createdAt: string;
  updatedAt: string;
}>;

export class InMemoryPlayerCharacterRepository extends PlayerCharacterRepository {
  private readonly characters = new Map<string, PlayerCharacter>();
  private readonly campaignIds = new Map<string, Set<string>>();
  private readonly states = new Map<string, CampaignState>();
  private readonly overrides = new Map<string, PlayerCharacter>();

  override listByCampaign(campaignId: string): Promise<readonly PlayerCharacter[]> {
    const ids = this.campaignIds.get(campaignId) ?? new Set<string>();
    return Promise.resolve(
      [...ids]
        .flatMap((id) => {
          const character = this.characters.get(id);
          return character ? [this.effective(character, campaignId)] : [];
        })
        .sort(
          (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
        ),
    );
  }

  override listAvailableByCampaign(campaignId: string): Promise<readonly PlayerCharacter[]> {
    const selected = this.campaignIds.get(campaignId) ?? new Set<string>();
    return Promise.resolve(
      [...this.characters.values()]
        .filter((character) => character.provenance === 'universe' && !selected.has(character.id))
        .map((character) => ({
          ...character,
          campaignId,
          playerName: '',
          status: 'active' as const,
          currentHitPoints: character.maxHitPoints,
        })),
    );
  }

  override findById(campaignId: string, id: string): Promise<PlayerCharacter | null> {
    const character = this.characters.get(id);
    return Promise.resolve(
      character && this.campaignIds.get(campaignId)?.has(id)
        ? this.effective(character, campaignId)
        : null,
    );
  }

  override async save(character: PlayerCharacter): Promise<void> {
    if (character.provenance === 'campaign') {
      this.characters.set(character.id, character);
    } else {
      this.overrides.set(this.key(character.campaignId, character.id), {
        ...character,
        provenance: 'override',
      });
    }
    await this.saveCampaignState(character);
  }

  override saveCampaignState(character: PlayerCharacter): Promise<void> {
    this.associate(character.campaignId, character.id);
    this.states.set(this.key(character.campaignId, character.id), {
      playerName: character.playerName,
      status: character.status,
      currentHitPoints: character.currentHitPoints,
      createdAt: character.createdAt,
      updatedAt: character.updatedAt,
    });
    return Promise.resolve();
  }

  override delete(campaignId: string, id: string): Promise<void> {
    const character = this.characters.get(id);
    if (character?.provenance === 'campaign' && character.campaignId === campaignId) {
      this.characters.delete(id);
    }
    this.overrides.delete(this.key(campaignId, id));
    this.states.delete(this.key(campaignId, id));
    this.campaignIds.get(campaignId)?.delete(id);
    return Promise.resolve();
  }

  override attach(campaignId: string, id: string): Promise<void> {
    const character = this.characters.get(id);
    if (character?.provenance !== 'universe') {
      return Promise.reject(new Error('PJ indisponible.'));
    }
    this.associate(campaignId, id);
    this.states.set(this.key(campaignId, id), {
      playerName: '',
      status: 'active',
      currentHitPoints: character.maxHitPoints,
      createdAt: character.createdAt,
      updatedAt: character.updatedAt,
    });
    return Promise.resolve();
  }

  override promote(campaignId: string, id: string): Promise<void> {
    const character = this.characters.get(id);
    if (!character || character.provenance !== 'campaign' || character.campaignId !== campaignId) {
      return Promise.reject(new Error('PJ indisponible.'));
    }
    this.characters.set(id, { ...character, provenance: 'universe' });
    return Promise.resolve();
  }

  override resetOverride(campaignId: string, id: string): Promise<void> {
    this.overrides.delete(this.key(campaignId, id));
    return Promise.resolve();
  }

  private associate(campaignId: string, id: string): void {
    const ids = this.campaignIds.get(campaignId) ?? new Set<string>();
    ids.add(id);
    this.campaignIds.set(campaignId, ids);
  }

  private effective(character: PlayerCharacter, campaignId: string): PlayerCharacter {
    const canonical = this.overrides.get(this.key(campaignId, character.id)) ?? {
      ...character,
      campaignId,
    };
    const state = this.states.get(this.key(campaignId, character.id));
    return state ? { ...canonical, ...state } : canonical;
  }

  private key(campaignId: string, id: string): string {
    return `${campaignId}:${id}`;
  }
}
