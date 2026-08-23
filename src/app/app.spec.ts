import { TestBed } from '@angular/core/testing';
import { App } from '@app/app';
import { ApplicationBackupGateway } from '@app/features/backups/data-access/application-backup.gateway';
import { ApplicationWindowGateway } from '@app/features/backups/data-access/application-window.gateway';
import { BrowserApplicationBackupGateway } from '@app/features/backups/data-access/browser-application-backup.gateway';
import { BrowserApplicationWindowGateway } from '@app/features/backups/data-access/browser-application-window.gateway';
import { TechnicalLogService } from '@app/features/diagnostics/application/technical-log.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: ApplicationBackupGateway, useClass: BrowserApplicationBackupGateway },
        { provide: ApplicationWindowGateway, useClass: BrowserApplicationWindowGateway },
        { provide: TechnicalLogService, useValue: { reportError: vi.fn() } },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should host the active route', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
