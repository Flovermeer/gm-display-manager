import { TestBed } from '@angular/core/testing';

import { MonsterImageGateway } from '@app/features/bestiary/data-access/monster-image.gateway';
import { UniverseResourceService } from '@app/features/game-systems/application/universe-resource.service';
import {
  primaryMediaPath,
  UniverseResourceEditorFacade,
} from '@app/features/game-systems/application/universe-resource-editor.facade';
import type {
  UniverseLocationDetail,
  UniverseNpcDetail,
} from '@app/features/game-systems/domain/universe-resource';
import { ItemImageGateway } from '@app/features/items/data-access/item-image.gateway';
import { LocationImageGateway } from '@app/features/locations/data-access/location-image.gateway';
import { NpcIdleVideoGateway } from '@app/features/npcs/data-access/npc-idle-video.gateway';
import { NpcPortraitGateway } from '@app/features/npcs/data-access/npc-portrait.gateway';
import { createEmptyNpcSheet } from '@app/features/npcs/domain/npc';
import { PlayerCharacterPortraitGateway } from '@app/features/players/data-access/player-character-portrait.gateway';

function gateway() {
  return {
    chooseAndImport: vi.fn(),
    resolveUrl: vi.fn(async (path: string) => `asset://${path}`),
    discard: vi.fn(async () => undefined),
  };
}

const base = {
  universeId: 'forgotten-realms',
  deletedAt: null,
  createdAt: '2026-11-13T00:00:00.000Z',
  updatedAt: '2026-11-13T00:00:00.000Z',
};

describe('UniverseResourceEditorFacade', () => {
  const portraits = gateway();
  const videos = gateway();
  const locations = gateway();
  const resources = { save: vi.fn(async <T>(resource: T) => resource) };
  const mira: UniverseNpcDetail = {
    ...base,
    id: 'mira',
    type: 'npc',
    name: 'Mira Vell',
    portraitPath: 'mira.webp',
    idleVideoPath: 'mira.webm',
    sheet: createEmptyNpcSheet(),
  };
  let facade: UniverseResourceEditorFacade;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: UniverseResourceService, useValue: resources },
        { provide: NpcPortraitGateway, useValue: portraits },
        { provide: NpcIdleVideoGateway, useValue: videos },
        { provide: PlayerCharacterPortraitGateway, useValue: gateway() },
        { provide: LocationImageGateway, useValue: locations },
        { provide: ItemImageGateway, useValue: gateway() },
        { provide: MonsterImageGateway, useValue: gateway() },
      ],
    });
    facade = TestBed.inject(UniverseResourceEditorFacade);
  });

  it('keeps only the first location image imported at once', async () => {
    locations.chooseAndImport.mockResolvedValue(['crypt.webp', 'altar.webp']);

    await expect(facade.importPrimaryMedia('location', 'forgotten-realms')).resolves.toEqual({
      path: 'crypt.webp',
      url: 'asset://crypt.webp',
    });
    expect(locations.discard).toHaveBeenCalledWith('altar.webp');
  });

  it('removes the replaced portrait and idle video after saving an NPC', async () => {
    await facade.save(mira, { ...mira, portraitPath: 'mira-v2.webp', idleVideoPath: null });

    expect(portraits.discard).toHaveBeenCalledWith('mira.webp');
    expect(videos.discard).toHaveBeenCalledWith('mira.webm');
  });

  it('never removes the shared image of a location gallery on save', async () => {
    const crypt: UniverseLocationDetail = {
      ...base,
      id: 'crypt',
      type: 'location',
      name: 'Crypte',
      parentLocationId: null,
      summary: '',
      imagePath: 'crypt.webp',
    };

    await facade.save(crypt, { ...crypt, imagePath: 'crypt-v2.webp' });

    expect(locations.discard).not.toHaveBeenCalled();
  });

  it('ignores a failed draft cleanup', async () => {
    portraits.discard.mockRejectedValueOnce(new Error('fichier verrouillé'));

    await expect(
      facade.discardDrafts('npc', { primaryMediaPath: 'draft.webp', idleVideoPath: 'draft.webm' }),
    ).resolves.toBeUndefined();
    expect(videos.discard).toHaveBeenCalledWith('draft.webm');
  });

  it('reads the portrait of characters and the image of other resources', () => {
    expect(primaryMediaPath(mira)).toBe('mira.webp');
  });
});
