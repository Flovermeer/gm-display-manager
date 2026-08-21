import { TestBed } from '@angular/core/testing';

import { ToastOutlet } from '@app/shared/ui/toast/toast-outlet';
import { ToastService } from '@app/shared/ui/toast/toast.service';

describe('ToastOutlet', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders an accessible close button', () => {
    const fixture = TestBed.createComponent(ToastOutlet);
    const service = TestBed.inject(ToastService);
    service.warning('Écran joueurs déconnecté.');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Écran joueurs déconnecté.',
    );
    element.querySelector<HTMLButtonElement>('button')?.click();
    fixture.detectChanges();
    expect(element.querySelector('.toast--closing')).toBeTruthy();
  });
});
