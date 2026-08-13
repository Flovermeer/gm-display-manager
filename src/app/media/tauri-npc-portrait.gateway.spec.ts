import { convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { copyFile, mkdir, remove } from '@tauri-apps/plugin-fs';

import { TauriNpcPortraitGateway } from '@app/media/tauri-npc-portrait.gateway';

vi.mock('@tauri-apps/api/core', () => ({ convertFileSrc: vi.fn() }));
vi.mock('@tauri-apps/api/path', () => ({ appDataDir: vi.fn(), join: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({
  BaseDirectory: { AppData: 14 },
  copyFile: vi.fn(),
  mkdir: vi.fn(),
  remove: vi.fn(),
}));

describe('TauriNpcPortraitGateway', () => {
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

  it('copies a selected image into the campaign media directory', async () => {
    vi.mocked(open).mockResolvedValue('C:\\Pictures\\syndra.webp');
    const gateway = new TauriNpcPortraitGateway();

    await expect(gateway.chooseAndImport('campaign-id')).resolves.toBe(
      'campaigns/campaign-id/media/npc-portraits/00000000-0000-4000-8000-000000000000.webp',
    );
    expect(mkdir).toHaveBeenCalledWith('campaigns/campaign-id/media/npc-portraits', {
      baseDir: 14,
      recursive: true,
    });
    expect(copyFile).toHaveBeenCalledWith(
      'C:\\Pictures\\syndra.webp',
      'C:\\AppData\\BeholdersInn\\campaigns\\campaign-id\\media\\npc-portraits\\00000000-0000-4000-8000-000000000000.webp',
    );
  });

  it('does nothing when the image dialog is cancelled', async () => {
    vi.mocked(open).mockResolvedValue(null);

    await expect(new TauriNpcPortraitGateway().chooseAndImport('campaign-id')).resolves.toBeNull();
    expect(copyFile).not.toHaveBeenCalled();
  });

  it('keeps the native reason when copying fails', async () => {
    vi.mocked(open).mockResolvedValue('C:\\Pictures\\syndra.webp');
    vi.mocked(copyFile).mockRejectedValue('forbidden path');

    await expect(new TauriNpcPortraitGateway().chooseAndImport('campaign-id')).rejects.toThrow(
      'Impossible de copier le portrait : forbidden path',
    );
  });

  it('resolves and deletes only internal portrait paths', async () => {
    const gateway = new TauriNpcPortraitGateway();
    const relativePath = 'campaigns/campaign-id/media/npc-portraits/syndra.png';

    await expect(gateway.resolveUrl(relativePath)).resolves.toContain('asset://');
    await gateway.discard(relativePath);

    expect(remove).toHaveBeenCalledWith(
      'C:\\AppData\\BeholdersInn\\campaigns\\campaign-id\\media\\npc-portraits\\syndra.png',
    );
    await expect(gateway.discard('../syndra.png')).rejects.toThrow(
      'Invalid internal NPC portrait path.',
    );
  });
});
