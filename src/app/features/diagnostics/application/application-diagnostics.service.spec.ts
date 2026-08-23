import { TestBed } from '@angular/core/testing';

import { ApplicationDiagnosticsService } from '@app/features/diagnostics/application/application-diagnostics.service';
import { TechnicalLogService } from '@app/features/diagnostics/application/technical-log.service';
import { MediaDiagnosticGateway } from '@app/features/diagnostics/data-access/media-diagnostic.gateway';
import type { MediaReference } from '@app/features/diagnostics/domain/diagnostic.models';

describe('ApplicationDiagnosticsService', () => {
  const reference: MediaReference = {
    kind: 'npc-portrait',
    resourceId: 'npc-id',
    resourceName: 'Syndra',
    relativePath: 'universes/universe-id/media/npc-portraits/syndra.webp',
  };
  const gateway = {
    isAvailable: true,
    isPrimaryWindow: true,
    listReferences: vi.fn(),
    inspectFile: vi.fn(),
    replaceFile: vi.fn(),
  };
  const log = {
    reportError: vi.fn(),
    reportWarning: vi.fn(),
    reportInfo: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    gateway.listReferences.mockResolvedValue([reference]);
    gateway.inspectFile.mockResolvedValue('healthy');
    gateway.replaceFile.mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        ApplicationDiagnosticsService,
        { provide: MediaDiagnosticGateway, useValue: gateway },
        { provide: TechnicalLogService, useValue: log },
      ],
    });
  });

  it('checks media automatically in the primary desktop window', async () => {
    const service = TestBed.inject(ApplicationDiagnosticsService);

    await service.initialize();

    expect(service.media().result).toMatchObject({ checkedCount: 1, issues: [] });
    expect(log.reportInfo).toHaveBeenCalledWith('media.check', '1 média(s) vérifié(s).');
  });

  it('keeps missing media in the diagnostic report', async () => {
    gateway.inspectFile.mockResolvedValue('missing');
    const service = TestBed.inject(ApplicationDiagnosticsService);

    await service.checkMedia();

    expect(service.media().result?.issues).toEqual([{ ...reference, reason: 'missing' }]);
    expect(log.reportWarning).toHaveBeenCalledWith('media.check', '1 média(s) indisponible(s).');
  });

  it('rechecks the report after replacing a file', async () => {
    gateway.inspectFile.mockResolvedValueOnce('missing').mockResolvedValueOnce('healthy');
    const service = TestBed.inject(ApplicationDiagnosticsService);
    await service.checkMedia();

    await service.replaceMedia(service.media().result!.issues[0]);

    expect(gateway.replaceFile).toHaveBeenCalledWith({ ...reference, reason: 'missing' });
    expect(service.media().result?.issues).toEqual([]);
  });
});
