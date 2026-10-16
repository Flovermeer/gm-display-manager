import { TestBed } from '@angular/core/testing';

import { ItemConfigurationService } from '@app/features/items/application/item-configuration.service';
import { ItemConfigurationRepository } from '@app/features/items/data-access/item-configuration.repository';
import { NarrativeItemRepository } from '@app/features/items/data-access/narrative-item.repository';
import { GameSystemService } from '@app/features/game-systems/application/game-system.service';

describe('ItemConfigurationService', () => {
  const configurationRepository = {
    list: vi.fn(),
    findByIdForCampaign: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
  };
  const itemRepository = { countUsingConfiguration: vi.fn() };
  const gameSystemService = { findUniverse: vi.fn() };
  let service: ItemConfigurationService;

  beforeEach(() => {
    vi.clearAllMocks();
    configurationRepository.list.mockResolvedValue([]);
    configurationRepository.save.mockResolvedValue(undefined);
    configurationRepository.delete.mockResolvedValue(undefined);
    itemRepository.countUsingConfiguration.mockResolvedValue(0);
    gameSystemService.findUniverse.mockResolvedValue(null);
    TestBed.configureTestingModule({
      providers: [
        ItemConfigurationService,
        { provide: ItemConfigurationRepository, useValue: configurationRepository },
        { provide: NarrativeItemRepository, useValue: itemRepository },
        { provide: GameSystemService, useValue: gameSystemService },
      ],
    });
    service = TestBed.inject(ItemConfigurationService);
  });

  it('creates configuration values in the selected universe', async () => {
    await service.create('universe-id', 'type', '  Artefact  ');

    expect(configurationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ universeId: 'universe-id', kind: 'type', name: 'Artefact' }),
    );
  });

  it('checks usage across the universe before deleting a value', async () => {
    const option = await service.create('universe-id', 'rarity', 'Unique');

    await service.delete(option);

    expect(itemRepository.countUsingConfiguration).toHaveBeenCalledWith(
      'universe-id',
      'rarity',
      option.id,
    );
    expect(configurationRepository.delete).toHaveBeenCalledWith('universe-id', 'rarity', option.id);
  });

  it('refuses to delete a value used by an item', async () => {
    itemRepository.countUsingConfiguration.mockResolvedValue(2);
    const option = await service.create('universe-id', 'type', 'Document');

    await expect(service.delete(option)).rejects.toThrow('Cette valeur est utilisée par 2 objets.');
    expect(configurationRepository.delete).not.toHaveBeenCalled();
  });

  it('serializes concurrent default initialization for one universe', async () => {
    await Promise.all([
      service.ensureDefaults('universe-id'),
      service.ensureDefaults('universe-id'),
    ]);

    expect(configurationRepository.save).toHaveBeenCalledTimes(12);
  });

  it('lists specific and generic values for a campaign universe', async () => {
    gameSystemService.findUniverse.mockResolvedValue({
      id: 'forgotten-realms',
      gameSystemId: 'dnd5e',
    });
    configurationRepository.list
      .mockResolvedValueOnce([{ id: 'specific', name: 'Spécifique' }])
      .mockResolvedValueOnce([{ id: 'generic', name: 'Générique' }]);

    const values = await service.listForCampaign('forgotten-realms', 'type');

    expect(configurationRepository.list).toHaveBeenNthCalledWith(1, 'forgotten-realms', 'type');
    expect(configurationRepository.list).toHaveBeenNthCalledWith(2, 'dnd5e:generic', 'type');
    expect(values.map(({ id }) => id)).toEqual(['generic', 'specific']);
  });
});
