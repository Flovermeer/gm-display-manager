import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ToastOutlet } from '@app/shared/ui/toast/toast-outlet';
import { BackupLifecycleDialogs } from '@app/features/backups/ui/backup-lifecycle-dialogs/backup-lifecycle-dialogs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastOutlet, BackupLifecycleDialogs],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
