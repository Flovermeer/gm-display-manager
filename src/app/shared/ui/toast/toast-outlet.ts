import { Component, inject } from '@angular/core';

import { ToastService } from '@app/shared/ui/toast/toast.service';

@Component({
  selector: 'app-toast-outlet',
  templateUrl: './toast-outlet.html',
  styleUrl: './toast-outlet.scss',
})
export class ToastOutlet {
  protected readonly toast = inject(ToastService);
}
