import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { CampaignNavigation } from '../campaign-navigation/campaign-navigation';
import { CampaignContext } from './campaign-context';

@Component({
  selector: 'app-campaign-layout',
  imports: [CampaignNavigation, RouterOutlet],
  providers: [CampaignContext],
  templateUrl: './campaign-layout.html',
  styleUrl: './campaign-layout.scss',
})
export class CampaignLayout implements OnInit {
  private readonly context = inject(CampaignContext);
  private readonly router = inject(Router);
  protected readonly campaign = this.context.campaign;
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      if (!(await this.context.load())) await this.router.navigate(['/campaigns']);
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Impossible de charger cette campagne.',
      );
    }
  }
}
