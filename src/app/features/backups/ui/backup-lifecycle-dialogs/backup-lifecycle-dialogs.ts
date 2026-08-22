import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ApplicationBackupService } from '@app/features/backups/application/application-backup.service';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';

@Component({
  selector: 'app-backup-lifecycle-dialogs',
  imports: [ButtonDirective, Dialog],
  templateUrl: './backup-lifecycle-dialogs.html',
  styleUrl: './backup-lifecycle-dialogs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackupLifecycleDialogs {
  protected readonly backup = inject(ApplicationBackupService);

  protected formatBackupDate(timestamp: number): string {
    return new Intl.DateTimeFormat('fr-BE', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(timestamp));
  }
}
