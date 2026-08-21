import { TestBed } from '@angular/core/testing';

import { ToastService } from '@app/shared/ui/toast/toast.service';

describe('ToastService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [ToastService] });
  });

  afterEach(() => vi.useRealTimers());

  it('closes a warning after eight seconds and removes it after the exit animation', () => {
    const service = TestBed.inject(ToastService);
    service.warning('Écran joueurs déconnecté.');

    expect(service.messages()).toHaveLength(1);
    vi.advanceTimersByTime(8_000);
    expect(service.messages()[0]?.isClosing).toBe(true);
    vi.advanceTimersByTime(240);
    expect(service.messages()).toEqual([]);
  });

  it('can be dismissed manually', () => {
    const service = TestBed.inject(ToastService);
    const id = service.warning('Écran joueurs déconnecté.');

    service.dismiss(id);
    expect(service.messages()[0]?.isClosing).toBe(true);
    vi.advanceTimersByTime(240);
    expect(service.messages()).toEqual([]);
  });
});
