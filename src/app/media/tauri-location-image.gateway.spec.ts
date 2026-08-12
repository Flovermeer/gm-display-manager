import { convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { copyFile, mkdir, remove } from '@tauri-apps/plugin-fs';

import { TauriLocationImageGateway } from './tauri-location-image.gateway';

vi.mock('@tauri-apps/api/core', () => ({ convertFileSrc: vi.fn() }));
vi.mock('@tauri-apps/api/path', () => ({ appDataDir: vi.fn(), join: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({
  BaseDirectory: { AppData: 14 },
  copyFile: vi.fn(),
  mkdir: vi.fn(),
  remove: vi.fn(),
}));

describe('TauriLocationImageGateway', () => {
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

  it('copies a selected image into the campaign location directory', async () => {
    vi.mocked(open).mockResolvedValue('C:\\Pictures\\port.webp');
    const gateway = new TauriLocationImageGateway();

    await expect(gateway.chooseAndImport('campaign-id')).resolves.toBe(
      'campaigns/campaign-id/media/locations/00000000-0000-4000-8000-000000000000.webp',
    );
    expect(mkdir).toHaveBeenCalledWith('campaigns/campaign-id/media/locations', {
      baseDir: 14,
      recursive: true,
    });
    expect(copyFile).toHaveBeenCalledWith(
      'C:\\Pictures\\port.webp',
      'C:\\AppData\\BeholdersInn\\campaigns\\campaign-id\\media\\locations\\00000000-0000-4000-8000-000000000000.webp',
    );
  });

  it('does nothing when the image dialog is cancelled', async () => {
    vi.mocked(open).mockResolvedValue(null);

    await expect(
      new TauriLocationImageGateway().chooseAndImport('campaign-id'),
    ).resolves.toBeNull();
    expect(copyFile).not.toHaveBeenCalled();
  });

  it('resolves and deletes only internal location image paths', async () => {
    const gateway = new TauriLocationImageGateway();
    const relativePath = 'campaigns/campaign-id/media/locations/port.png';

    await expect(gateway.resolveUrl(relativePath)).resolves.toContain('asset://');
    await gateway.discard(relativePath);

    expect(remove).toHaveBeenCalledWith(
      'C:\\AppData\\BeholdersInn\\campaigns\\campaign-id\\media\\locations\\port.png',
    );
    await expect(gateway.discard('../port.png')).rejects.toThrow(
      'Invalid internal location image path.',
    );
  });
});
