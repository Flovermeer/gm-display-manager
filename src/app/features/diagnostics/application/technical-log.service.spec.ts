import { TestBed } from '@angular/core/testing';

import { TechnicalLogService } from '@app/features/diagnostics/application/technical-log.service';
import { TechnicalLogGateway } from '@app/features/diagnostics/data-access/technical-log.gateway';

describe('TechnicalLogService', () => {
  const gateway = {
    isAvailable: true,
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    openDirectory: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    gateway.error.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [TechnicalLogService, { provide: TechnicalLogGateway, useValue: gateway }],
    });
  });

  it('redacts absolute paths from error details', async () => {
    const error = new Error(
      'Unable to read C:\\Users\\MJ\\secret.webp. See https://angular.dev/errors/NG0203',
    );

    TestBed.inject(TechnicalLogService).reportError('media read', error);
    await vi.waitFor(() => expect(gateway.error).toHaveBeenCalled());

    const entry = gateway.error.mock.calls[0][0] as string;
    expect(entry).toContain('[media_read]');
    expect(entry).toContain('<local-path>');
    expect(entry).toContain('https://angular.dev/errors/NG0203');
    expect(entry).not.toContain('secret.webp');
  });
});
