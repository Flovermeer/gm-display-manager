import { TestBed } from '@angular/core/testing';

import { PlayerCharacterService } from '@app/features/players/application/player-character.service';
import { PlayerCharacterWorkspaceFacade } from '@app/features/players/application/player-character-workspace.facade';
import { PlayerCharacterPortraitGateway } from '@app/features/players/data-access/player-character-portrait.gateway';
import {
  createPlayerCharacter,
  EMPTY_PLAYER_CHARACTER_SHEET,
  type PlayerCharacter,
  type UpdatePlayerCharacterInput,
} from '@app/features/players/domain/player-character';

describe('PlayerCharacterWorkspaceFacade', () => {
  const portraits = { chooseAndImport: vi.fn(), resolveUrl: vi.fn(), discard: vi.fn() };
  const characters = { create: vi.fn(), update: vi.fn(), delete: vi.fn() };
  const input: UpdatePlayerCharacterInput = {
    name: 'Nyssa',
    playerName: 'Camille',
    status: 'active',
    currentHitPoints: 18,
    maxHitPoints: 24,
    sheet: EMPTY_PLAYER_CHARACTER_SHEET,
  };
  let facade: PlayerCharacterWorkspaceFacade;

  function character(overrides: Partial<PlayerCharacter> = {}): PlayerCharacter {
    return {
      ...createPlayerCharacter('campaign-id', { ...input, portraitPath: 'nyssa.webp' }),
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    portraits.resolveUrl.mockImplementation(async (path: string) => `asset://${path}`);
    portraits.discard.mockResolvedValue(undefined);
    characters.delete.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: PlayerCharacterService, useValue: characters },
        { provide: PlayerCharacterPortraitGateway, useValue: portraits },
      ],
    });
    facade = TestBed.inject(PlayerCharacterWorkspaceFacade);
  });

  it('removes an imported portrait whose preview cannot be resolved', async () => {
    portraits.chooseAndImport.mockResolvedValue('draft.webp');
    portraits.resolveUrl.mockRejectedValueOnce(new Error('fichier illisible'));

    await expect(facade.importPortrait('universe-id')).rejects.toThrow('fichier illisible');
    expect(portraits.discard).toHaveBeenCalledWith('draft.webp');
  });

  it('removes only the replaced portrait owned by the campaign', async () => {
    const existing = character({ provenance: 'campaign' });
    characters.update.mockResolvedValue({ ...existing, portraitPath: 'new.webp' });

    await facade.save({ campaignId: 'campaign-id', existing, input, portraitPath: 'new.webp' });
    expect(portraits.discard).toHaveBeenCalledWith('nyssa.webp');

    portraits.discard.mockClear();
    const canonical = character({ provenance: 'universe' });
    characters.update.mockResolvedValue({ ...canonical, portraitPath: 'new.webp' });
    await facade.save({
      campaignId: 'campaign-id',
      existing: canonical,
      input,
      portraitPath: 'new.webp',
    });
    expect(portraits.discard).not.toHaveBeenCalled();
  });

  it('deletes a campaign character and reports portrait cleanup errors', async () => {
    const nyssa = character({ provenance: 'campaign' });
    portraits.discard.mockRejectedValue(new Error('portrait verrouillé'));

    const errors = await facade.delete(nyssa);

    expect(characters.delete).toHaveBeenCalledWith(nyssa);
    expect(errors).toEqual([new Error('portrait verrouillé')]);
  });
});
