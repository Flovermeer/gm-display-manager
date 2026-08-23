import { appDataDir, join } from '@tauri-apps/api/path';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open } from '@tauri-apps/plugin-dialog';
import { copyFile, exists, mkdir, stat } from '@tauri-apps/plugin-fs';
import Database from '@tauri-apps/plugin-sql';

import { TauriMediaDiagnosticGateway } from '@app/features/diagnostics/data-access/tauri-media-diagnostic.gateway';
import type { MediaReference } from '@app/features/diagnostics/domain/diagnostic.models';

vi.mock('@tauri-apps/api/path', () => ({ appDataDir: vi.fn(), join: vi.fn() }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({
  BaseDirectory: { AppData: 22 },
  copyFile: vi.fn(),
  exists: vi.fn(),
  mkdir: vi.fn(),
  stat: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

describe('TauriMediaDiagnosticGateway', () => {
  const reference: MediaReference = {
    kind: 'npc-portrait',
    resourceId: 'npc-id',
    resourceName: 'Syndra',
    relativePath: 'universes/universe-id/media/npc-portraits/syndra.webp',
  };
  const database = { select: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentWindow).mockReturnValue({ label: 'main' } as never);
    vi.mocked(Database.load).mockResolvedValue(database as never);
    vi.mocked(appDataDir).mockResolvedValue('C:\\AppData\\BeholdersInn');
    vi.mocked(join).mockImplementation((...parts) => Promise.resolve(parts.join('\\')));
    vi.mocked(exists).mockResolvedValue(true);
    vi.mocked(stat).mockResolvedValue({ isFile: true } as never);
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(copyFile).mockResolvedValue(undefined);
  });

  it('maps and deduplicates media references from SQLite', async () => {
    const row = {
      kind: 'npc-portrait',
      resource_id: 'npc-id',
      resource_name: 'Syndra',
      relative_path: reference.relativePath,
    };
    database.select.mockResolvedValue([row, row]);

    await expect(new TauriMediaDiagnosticGateway().listReferences()).resolves.toEqual([reference]);
  });

  it('reports a missing file without reading its contents', async () => {
    vi.mocked(exists).mockResolvedValue(false);

    await expect(new TauriMediaDiagnosticGateway().inspectFile(reference)).resolves.toBe('missing');
    expect(stat).not.toHaveBeenCalled();
  });

  it('copies a same-format replacement to the existing internal path', async () => {
    vi.mocked(open).mockResolvedValue('C:\\Pictures\\syndra.webp');

    await expect(new TauriMediaDiagnosticGateway().replaceFile(reference)).resolves.toBe(true);

    expect(mkdir).toHaveBeenCalledWith('universes/universe-id/media/npc-portraits', {
      baseDir: 22,
      recursive: true,
    });
    expect(copyFile).toHaveBeenCalledWith(
      'C:\\Pictures\\syndra.webp',
      expect.stringContaining('universes\\universe-id\\media\\npc-portraits\\syndra.webp'),
    );
  });
});
