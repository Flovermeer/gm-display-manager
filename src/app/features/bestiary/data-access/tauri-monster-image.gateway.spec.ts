import { convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { copyFile, mkdir, remove } from '@tauri-apps/plugin-fs';

import { TauriMonsterImageGateway } from '@app/features/bestiary/data-access/tauri-monster-image.gateway';

vi.mock('@tauri-apps/api/core', () => ({ convertFileSrc: vi.fn() }));
vi.mock('@tauri-apps/api/path', () => ({ appDataDir: vi.fn(), join: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({
  BaseDirectory: { AppData: 22 },
  copyFile: vi.fn(),
  mkdir: vi.fn(),
  remove: vi.fn(),
}));

describe('TauriMonsterImageGateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(appDataDir).mockResolvedValue('C:\\AppData\\BeholdersInn');
    vi.mocked(join).mockImplementation((...parts) => Promise.resolve(parts.join('\\')));
    vi.mocked(convertFileSrc).mockImplementation((path) => `asset://${path}`);
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(copyFile).mockResolvedValue(undefined);
    vi.mocked(remove).mockResolvedValue(undefined);
  });

  it('copies a selected illustration into the universe bestiary directory', async () => {
    vi.mocked(open).mockResolvedValue('C:\\Pictures\\atropal.webp');

    const relativePath = await new TauriMonsterImageGateway().chooseAndImport('forgotten-realms');

    expect(relativePath).toMatch(
      /^universes\/forgotten-realms\/media\/monsters\/[0-9a-f-]+\.webp$/,
    );
    expect(mkdir).toHaveBeenCalledWith('universes/forgotten-realms/media/monsters', {
      baseDir: 22,
      recursive: true,
    });
    expect(copyFile).toHaveBeenCalledWith(
      'C:\\Pictures\\atropal.webp',
      expect.stringContaining('universes\\forgotten-realms\\media\\monsters'),
    );
  });

  it('keeps the native filesystem error in the displayed message', async () => {
    vi.mocked(open).mockResolvedValue('C:\\Pictures\\atropal.webp');
    vi.mocked(copyFile).mockRejectedValue('forbidden path');

    await expect(
      new TauriMonsterImageGateway().chooseAndImport('forgotten-realms'),
    ).rejects.toThrow('Impossible de copier l’illustration : forbidden path');
  });

  it('resolves and removes an internal bestiary image', async () => {
    const path = 'universes/forgotten-realms/media/monsters/atropal.webp';
    const gateway = new TauriMonsterImageGateway();

    await expect(gateway.resolveUrl(path)).resolves.toContain('asset://');
    await gateway.discard(path);

    expect(remove).toHaveBeenCalledWith(
      expect.stringContaining('universes\\forgotten-realms\\media\\monsters\\atropal.webp'),
    );
  });
});
