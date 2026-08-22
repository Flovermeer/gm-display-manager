import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

import { TauriApplicationWindowGateway } from '@app/features/backups/data-access/tauri-application-window.gateway';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/webviewWindow', () => ({ getCurrentWebviewWindow: vi.fn() }));

describe('TauriApplicationWindowGateway', () => {
  const currentWindow = {
    label: 'main',
    onCloseRequested: vi.fn(),
    close: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentWebviewWindow).mockReturnValue(currentWindow as never);
    currentWindow.close.mockResolvedValue(undefined);
    vi.mocked(invoke).mockResolvedValue(undefined);
  });

  it('prevents the native close until the application has made its backup decision', async () => {
    const callback = vi.fn();
    const unlisten = vi.fn();
    const preventDefault = vi.fn();
    currentWindow.onCloseRequested.mockImplementation(async (handler) => {
      handler({ preventDefault });
      return unlisten;
    });
    const gateway = new TauriApplicationWindowGateway();

    await expect(gateway.listenForCloseRequest(callback)).resolves.toBe(unlisten);

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledOnce();
    expect(gateway.isPrimaryWindow).toBe(true);
  });

  it('exits the complete application after the listener is released', async () => {
    await new TauriApplicationWindowGateway().close();

    expect(invoke).toHaveBeenCalledWith('exit_application');
  });
});
