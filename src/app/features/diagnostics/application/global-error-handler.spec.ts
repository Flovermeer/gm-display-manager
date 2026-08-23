import { TestBed } from '@angular/core/testing';

import { GlobalErrorHandler } from '@app/features/diagnostics/application/global-error-handler';
import { TechnicalLogService } from '@app/features/diagnostics/application/technical-log.service';
import { ToastService } from '@app/shared/ui/toast/toast.service';

describe('GlobalErrorHandler', () => {
  const log = { reportError: vi.fn() };
  const toast = { warning: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        GlobalErrorHandler,
        { provide: TechnicalLogService, useValue: log },
        { provide: ToastService, useValue: toast },
      ],
    });
  });

  it('logs an unexpected error and shows a generic warning', () => {
    const error = new Error('database internals');

    TestBed.inject(GlobalErrorHandler).handleError(error);

    expect(log.reportError).toHaveBeenCalledWith('angular.unhandled', error);
    expect(toast.warning).toHaveBeenCalledWith(
      'Une erreur inattendue est survenue. Les détails ont été ajoutés au journal technique.',
    );
  });

  it('unwraps unhandled promise rejections', () => {
    const rejection = new Error('rejected');

    TestBed.inject(GlobalErrorHandler).handleError({ rejection });

    expect(log.reportError).toHaveBeenCalledWith('angular.unhandled', rejection);
  });
});
