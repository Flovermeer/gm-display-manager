import { convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { copyFile, mkdir, remove } from '@tauri-apps/plugin-fs';

import { TauriPlayerCharacterPortraitGateway } from '@app/features/players/data-access/tauri-player-character-portrait.gateway';

vi.mock('@tauri-apps/api/core', () => ({ convertFileSrc: vi.fn() }));
vi.mock('@tauri-apps/api/path', () => ({ appDataDir: vi.fn(), join: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({
  BaseDirectory: { AppData: 14 },
  copyFile: vi.fn(),
  mkdir: vi.fn(),
  remove: vi.fn(),
}));

describe('TauriPlayerCharacterPortraitGateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(appDataDir).mockResolvedValue('C:\\AppData\\BeholdersInn');
    vi.mocked(join).mockImplementation((...parts) => Promise.resolve(parts.join('\\')));
    vi.mocked(convertFileSrc).mockImplementation((path) => `asset://${path}`);
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(copyFile).mockResolvedValue(undefined);
    vi.mocked(remove).mockResolvedValue(undefined);
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000000');
  });

  it('copies and resolves a player character portrait in its campaign directory', async () => {
    vi.mocked(open).mockResolvedValue('C:\\Pictures\\nyssa.webp');
    const gateway = new TauriPlayerCharacterPortraitGateway();
    const relativePath =
      'campaigns/campaign-id/media/player-character-portraits/00000000-0000-4000-8000-000000000000.webp';

    await expect(gateway.chooseAndImport('campaign-id')).resolves.toBe(relativePath);
    expect(mkdir).toHaveBeenCalledWith('campaigns/campaign-id/media/player-character-portraits', {
      baseDir: 14,
      recursive: true,
    });
    await expect(gateway.resolveUrl(relativePath)).resolves.toContain('asset://');
    await gateway.discard(relativePath);
    expect(remove).toHaveBeenCalled();
  });

  it('rejects paths outside the player character portrait directory', async () => {
    await expect(
      new TauriPlayerCharacterPortraitGateway().discard(
        'campaigns/campaign-id/media/npc-portraits/nyssa.webp',
      ),
    ).rejects.toThrow('Invalid internal player character portrait path.');
  });
});
