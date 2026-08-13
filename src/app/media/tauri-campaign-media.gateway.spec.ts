import { exists, remove } from '@tauri-apps/plugin-fs';

import { TauriCampaignMediaGateway } from '@app/media/tauri-campaign-media.gateway';

vi.mock('@tauri-apps/plugin-fs', () => ({
  BaseDirectory: { AppData: 14 },
  exists: vi.fn(),
  remove: vi.fn(),
}));

describe('TauriCampaignMediaGateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(remove).mockResolvedValue(undefined);
  });

  it('removes the campaign media directory recursively when it exists', async () => {
    vi.mocked(exists).mockResolvedValue(true);

    await new TauriCampaignMediaGateway().discardCampaign('campaign-id');

    expect(exists).toHaveBeenCalledWith('campaigns/campaign-id', { baseDir: 14 });
    expect(remove).toHaveBeenCalledWith('campaigns/campaign-id', {
      baseDir: 14,
      recursive: true,
    });
  });

  it('does not remove anything when no campaign media directory exists', async () => {
    vi.mocked(exists).mockResolvedValue(false);

    await new TauriCampaignMediaGateway().discardCampaign('campaign-id');

    expect(remove).not.toHaveBeenCalled();
  });

  it('rejects unsafe campaign identifiers', async () => {
    await expect(new TauriCampaignMediaGateway().discardCampaign('../campaign')).rejects.toThrow(
      'Invalid campaign identifier.',
    );
  });
});
