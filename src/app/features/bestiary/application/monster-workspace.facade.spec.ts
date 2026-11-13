import { TestBed } from '@angular/core/testing';

import { MonsterService } from '@app/features/bestiary/application/monster.service';
import { MonsterWorkspaceFacade } from '@app/features/bestiary/application/monster-workspace.facade';
import { MonsterImageGateway } from '@app/features/bestiary/data-access/monster-image.gateway';
import { createEmptyMonsterSheet, createMonster } from '@app/features/bestiary/domain/monster';

describe('MonsterWorkspaceFacade', () => {
  const images = { chooseAndImport: vi.fn(), resolveUrl: vi.fn(), discard: vi.fn() };
  const monsters = { create: vi.fn(), update: vi.fn() };
  const atropal = createMonster('campaign-id', {
    name: 'Atropal',
    imagePath: 'atropal.webp',
    sheet: createEmptyMonsterSheet(),
  });
  let facade: MonsterWorkspaceFacade;

  beforeEach(() => {
    vi.clearAllMocks();
    images.resolveUrl.mockImplementation(async (path: string) => `asset://${path}`);
    images.discard.mockResolvedValue(undefined);
    monsters.update.mockImplementation(async (monster, input) => ({ ...monster, ...input }));
    TestBed.configureTestingModule({
      providers: [
        { provide: MonsterService, useValue: monsters },
        { provide: MonsterImageGateway, useValue: images },
      ],
    });
    facade = TestBed.inject(MonsterWorkspaceFacade);
  });

  it('keeps the current image when no new image was imported', async () => {
    const saved = await facade.save({
      campaignId: 'campaign-id',
      existing: atropal,
      name: 'Atropal',
      sheet: atropal.sheet,
      importedImagePath: null,
    });

    expect(saved.imagePath).toBe('atropal.webp');
    expect(images.discard).not.toHaveBeenCalled();
  });

  it('replaces the image and ignores a failed cleanup of the previous one', async () => {
    images.discard.mockRejectedValue(new Error('image verrouillée'));

    const saved = await facade.save({
      campaignId: 'campaign-id',
      existing: atropal,
      name: 'Atropal',
      sheet: atropal.sheet,
      importedImagePath: 'atropal-v2.webp',
    });

    expect(saved.imagePath).toBe('atropal-v2.webp');
    expect(images.discard).toHaveBeenCalledWith('atropal.webp');
  });

  it('resolves an imported image preview', async () => {
    images.chooseAndImport.mockResolvedValue('draft.webp');

    await expect(facade.importImage('universe-id')).resolves.toEqual({
      path: 'draft.webp',
      url: 'asset://draft.webp',
    });
    await expect(facade.imageUrl(null)).resolves.toBeNull();
  });
});
