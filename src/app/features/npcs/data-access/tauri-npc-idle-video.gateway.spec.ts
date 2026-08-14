import { convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { copyFile, mkdir, remove } from '@tauri-apps/plugin-fs';

import { TauriNpcIdleVideoGateway } from '@app/features/npcs/data-access/tauri-npc-idle-video.gateway';

vi.mock('@tauri-apps/api/core', () => ({ convertFileSrc: vi.fn() }));
vi.mock('@tauri-apps/api/path', () => ({ appDataDir: vi.fn(), join: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({
  BaseDirectory: { AppData: 14 },
  copyFile: vi.fn(),
  mkdir: vi.fn(),
  remove: vi.fn(),
}));

describe('TauriNpcIdleVideoGateway', () => {
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

  it('imports WebM and MP4 files into the campaign directory', async () => {
    vi.mocked(open).mockResolvedValue('C:\\Videos\\syndra.webm');

    await expect(new TauriNpcIdleVideoGateway().chooseAndImport('campaign-id')).resolves.toBe(
      'campaigns/campaign-id/media/npc-idle-videos/00000000-0000-4000-8000-000000000000.webm',
    );
    expect(copyFile).toHaveBeenCalledWith(
      'C:\\Videos\\syndra.webm',
      expect.stringContaining('npc-idle-videos'),
    );
  });

  it('resolves and removes only internal idle videos', async () => {
    const gateway = new TauriNpcIdleVideoGateway();
    const path = 'campaigns/campaign-id/media/npc-idle-videos/syndra.mp4';

    await expect(gateway.resolveUrl(path)).resolves.toContain('asset://');
    await gateway.discard(path);
    expect(remove).toHaveBeenCalledWith(expect.stringContaining('syndra.mp4'));
    await expect(gateway.discard('../syndra.mp4')).rejects.toThrow(
      'Invalid internal NPC idle video path.',
    );
  });
});
