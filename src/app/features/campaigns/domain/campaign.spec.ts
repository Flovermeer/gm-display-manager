import {
  createCampaign,
  updateCampaign,
  type CampaignFactoryDependencies,
} from '@app/features/campaigns/domain/campaign';

describe('createCampaign', () => {
  const dependencies: CampaignFactoryDependencies = {
    createId: () => 'campaign-id',
    now: () => new Date('2026-08-12T18:30:00.000Z'),
  };

  it('creates a normalized campaign in the selected universe', () => {
    expect(
      createCampaign(
        {
          name: '  Tomb of Annihilation  ',
          description: '  Exploration de Chult  ',
          universeId: '  forgotten-realms  ',
        },
        dependencies,
      ),
    ).toEqual({
      id: 'campaign-id',
      name: 'Tomb of Annihilation',
      description: 'Exploration de Chult',
      universeId: 'forgotten-realms',
      createdAt: '2026-08-12T18:30:00.000Z',
      updatedAt: '2026-08-12T18:30:00.000Z',
    });
  });

  it('rejects an empty campaign name', () => {
    expect(() =>
      createCampaign({ name: '   ', universeId: 'forgotten-realms' }, dependencies),
    ).toThrow(
      'Campaign name is required.',
    );
  });

  it('rejects an empty universe', () => {
    expect(() => createCampaign({ name: 'Tomb', universeId: '  ' }, dependencies)).toThrow(
      'Campaign universe is required.',
    );
  });

  it('updates normalized editable fields', () => {
    const campaign = createCampaign(
      { name: 'Tomb', universeId: 'forgotten-realms' },
      dependencies,
    );

    expect(
      updateCampaign(
        campaign,
        {
          name: ' Tomb of Annihilation ',
          description: ' Exploration de Chult ',
        },
        () => new Date('2026-08-13T10:00:00.000Z'),
      ),
    ).toMatchObject({
      id: campaign.id,
      name: 'Tomb of Annihilation',
      description: 'Exploration de Chult',
      universeId: 'forgotten-realms',
      updatedAt: '2026-08-13T10:00:00.000Z',
    });
  });
});
