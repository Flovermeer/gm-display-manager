import {
  createCampaign,
  DEFAULT_CAMPAIGN_SYSTEM_KEY,
  updateCampaign,
  type CampaignFactoryDependencies,
} from '@app/features/campaigns/domain/campaign';

describe('createCampaign', () => {
  const dependencies: CampaignFactoryDependencies = {
    createId: () => 'campaign-id',
    now: () => new Date('2026-08-12T18:30:00.000Z'),
  };

  it('creates a normalized D&D 5e campaign by default', () => {
    expect(
      createCampaign(
        {
          name: '  Tomb of Annihilation  ',
          description: '  Exploration de Chult  ',
        },
        dependencies,
      ),
    ).toEqual({
      id: 'campaign-id',
      name: 'Tomb of Annihilation',
      description: 'Exploration de Chult',
      systemKey: DEFAULT_CAMPAIGN_SYSTEM_KEY,
      createdAt: '2026-08-12T18:30:00.000Z',
      updatedAt: '2026-08-12T18:30:00.000Z',
    });
  });

  it('keeps an explicit system key', () => {
    const campaign = createCampaign(
      { name: 'Brindlewood Bay', systemKey: '  brindlewood-bay  ' },
      dependencies,
    );

    expect(campaign.systemKey).toBe('brindlewood-bay');
  });

  it('rejects an empty campaign name', () => {
    expect(() => createCampaign({ name: '   ' }, dependencies)).toThrow(
      'Campaign name is required.',
    );
  });

  it('updates normalized editable fields', () => {
    const campaign = createCampaign({ name: 'Tomb' }, dependencies);

    expect(
      updateCampaign(
        campaign,
        {
          name: ' Tomb of Annihilation ',
          description: ' Exploration de Chult ',
          systemKey: ' dnd5e ',
        },
        () => new Date('2026-08-13T10:00:00.000Z'),
      ),
    ).toMatchObject({
      id: campaign.id,
      name: 'Tomb of Annihilation',
      description: 'Exploration de Chult',
      systemKey: 'dnd5e',
      updatedAt: '2026-08-13T10:00:00.000Z',
    });
  });
});
