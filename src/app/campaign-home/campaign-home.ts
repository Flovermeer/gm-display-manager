import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import type { Campaign } from '../campaign/campaign';
import { CampaignService } from '../campaign/campaign.service';
import { ButtonDirective } from '../shared/ui/button/button.directive';
import { Dialog } from '../shared/ui/dialog/dialog';
import { FormField, type FormFieldOption } from '../shared/ui/form-field/form-field';

@Component({
  selector: 'app-campaign-home',
  imports: [ReactiveFormsModule, ButtonDirective, Dialog, FormField],
  templateUrl: './campaign-home.html',
  styleUrl: './campaign-home.scss',
})
export class CampaignHome implements OnInit {
  protected readonly systemOptions: readonly FormFieldOption[] = [
    { value: 'dnd5e', label: 'Dungeons & Dragons 5e' },
  ];
  private readonly campaignService = inject(CampaignService);
  private readonly router = inject(Router);

  protected readonly campaigns = signal<readonly Campaign[]>([]);
  protected readonly activeCampaignId = signal<string | null>(null);
  protected readonly editingCampaign = signal<Campaign | null>(null);
  protected readonly campaignPendingDeletion = signal<Campaign | null>(null);
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
    if (this.isSubmitting() || this.editingCampaign()) {
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

  protected editCampaign(campaign: Campaign): void {
    if (this.isSubmitting()) {
      return;
    }

    this.editingCampaign.set(campaign);
    this.campaignForm.reset({
      name: campaign.name,
      description: campaign.description,
      systemKey: campaign.systemKey,
    });
    this.campaignForm.markAsPristine();
  }

  protected cancelEditing(): void {
    this.editingCampaign.set(null);
    this.resetCampaignForm();
  }

  protected requestDeleteCampaign(campaign: Campaign): void {
    if (!this.isSubmitting()) {
      this.campaignPendingDeletion.set(campaign);
    }
  }

  protected cancelDelete(): void {
    this.campaignPendingDeletion.set(null);
  }

  protected async saveCampaign(): Promise<void> {
    if (this.campaignForm.invalid || this.isSubmitting()) {
      this.campaignForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      const editingCampaign = this.editingCampaign();
      if (editingCampaign) {
        const updatedCampaign = await this.campaignService.update(
          editingCampaign,
          this.campaignForm.getRawValue(),
        );
        this.campaigns.update((campaigns) =>
          campaigns
            .map((campaign) => (campaign.id === updatedCampaign.id ? updatedCampaign : campaign))
            .sort(
              (left, right) =>
                left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
            ),
        );
        this.editingCampaign.set(null);
        this.resetCampaignForm();
        this.isSubmitting.set(false);
      } else {
        const campaign = await this.campaignService.createAndActivate(
          this.campaignForm.getRawValue(),
        );
        await this.router.navigate(['/campaigns', campaign.id]);
      }
    } catch (error) {
      this.error.set(this.errorMessage(error));
      this.isSubmitting.set(false);
    }
  }

  protected async confirmDeleteCampaign(): Promise<void> {
    const campaign = this.campaignPendingDeletion();
    if (!campaign || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      await this.campaignService.delete(campaign);
      if (this.editingCampaign()?.id === campaign.id) {
        this.editingCampaign.set(null);
        this.resetCampaignForm();
      }
      this.campaignPendingDeletion.set(null);
    } catch (error) {
      this.error.set(this.errorMessage(error));
    } finally {
      await this.loadCampaigns();
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

  private resetCampaignForm(): void {
    this.campaignForm.reset({ name: '', description: '', systemKey: 'dnd5e' });
    this.campaignForm.markAsPristine();
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return "Une erreur inattendue empêche d'accéder aux campagnes.";
  }
}
