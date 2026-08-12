import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import type { Campaign } from '../campaign/campaign';
import { CampaignService } from '../campaign/campaign.service';

@Component({
  selector: 'app-campaign-home',
  imports: [ReactiveFormsModule],
  templateUrl: './campaign-home.html',
  styleUrl: './campaign-home.scss',
})
export class CampaignHome implements OnInit {
  private readonly campaignService = inject(CampaignService);
  private readonly router = inject(Router);

  protected readonly campaigns = signal<readonly Campaign[]>([]);
  protected readonly activeCampaignId = signal<string | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly campaignForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    description: new FormControl('', { nonNullable: true }),
    systemKey: new FormControl('dnd5e', { nonNullable: true }),
  });

  ngOnInit(): void {
    void this.loadCampaigns();
  }

  protected async openCampaign(campaign: Campaign): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      await this.campaignService.activate(campaign.id);
      await this.router.navigate(['/campaigns', campaign.id]);
    } catch (error) {
      this.error.set(this.errorMessage(error));
      this.isSubmitting.set(false);
    }
  }

  protected async createCampaign(): Promise<void> {
    if (this.campaignForm.invalid || this.isSubmitting()) {
      this.campaignForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      const campaign = await this.campaignService.createAndActivate(
        this.campaignForm.getRawValue(),
      );
      await this.router.navigate(['/campaigns', campaign.id]);
    } catch (error) {
      this.error.set(this.errorMessage(error));
      this.isSubmitting.set(false);
    }
  }

  private async loadCampaigns(): Promise<void> {
    try {
      const [campaigns, activeCampaignId] = await Promise.all([
        this.campaignService.list(),
        this.campaignService.getActiveCampaignId(),
      ]);
      this.campaigns.set(campaigns);
      this.activeCampaignId.set(activeCampaignId);
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error
      ? error.message
      : "Une erreur inattendue empêche d'accéder aux campagnes.";
  }
}
