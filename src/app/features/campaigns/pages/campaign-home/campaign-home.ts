import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import type { Campaign } from '@app/features/campaigns/domain/campaign';
import { CampaignService } from '@app/features/campaigns/application/campaign.service';
import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { Dialog } from '@app/shared/ui/dialog/dialog';
import { FormField, type FormFieldOption } from '@app/shared/ui/form-field/form-field';
import { GameSystemService } from '@app/features/game-systems/application/game-system.service';
import type {
  GameSystem,
  GameUniverse,
} from '@app/features/game-systems/domain/game-system';

type PendingCampaignCreation = Readonly<{
  name: string;
  description: string;
  universeId: string;
  systemName: string;
  universeName: string;
}>;

@Component({
  selector: 'app-campaign-home',
  imports: [ReactiveFormsModule, RouterLink, ButtonDirective, Dialog, FormField],
  templateUrl: './campaign-home.html',
  styleUrl: './campaign-home.scss',
})
export class CampaignHome implements OnInit {
  private readonly campaignService = inject(CampaignService);
  private readonly gameSystemService = inject(GameSystemService);
  private readonly router = inject(Router);

  protected readonly campaigns = signal<readonly Campaign[]>([]);
  protected readonly activeCampaignId = signal<string | null>(null);
  protected readonly editingCampaign = signal<Campaign | null>(null);
  protected readonly campaignPendingDeletion = signal<Campaign | null>(null);
  protected readonly campaignPendingCreation = signal<PendingCampaignCreation | null>(null);
  protected readonly gameSystems = signal<readonly GameSystem[]>([]);
  protected readonly universes = signal<readonly GameUniverse[]>([]);
  protected readonly systemOptions = computed<readonly FormFieldOption[]>(() =>
    this.gameSystems().map(({ id, name }) => ({ value: id, label: name })),
  );
  protected readonly universeOptions = computed<readonly FormFieldOption[]>(() =>
    this.universes().map(({ id, name }) => ({ value: id, label: name })),
  );
  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly campaignForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    description: new FormControl('', { nonNullable: true }),
    gameSystemId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    universeId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  ngOnInit(): void {
    void this.initialize();
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
    const universe = this.universes().find(({ id }) => id === campaign.universeId);
    this.campaignForm.reset({
      name: campaign.name,
      description: campaign.description,
      gameSystemId: universe?.gameSystemId ?? '',
      universeId: campaign.universeId,
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
        const value = this.campaignForm.getRawValue();
        const gameSystem = this.gameSystems().find(({ id }) => id === value.gameSystemId);
        const universe = this.universes().find(({ id }) => id === value.universeId);
        if (!gameSystem || !universe) throw new Error('Choisis un système et un univers valides.');
        this.campaignPendingCreation.set({
          name: value.name.trim(),
          description: value.description,
          universeId: universe.id,
          systemName: gameSystem.name,
          universeName: universe.name,
        });
        this.isSubmitting.set(false);
      }
    } catch (error) {
      this.error.set(this.errorMessage(error));
      this.isSubmitting.set(false);
    }
  }

  protected cancelCreateCampaign(): void {
    this.campaignPendingCreation.set(null);
  }

  protected async confirmCreateCampaign(): Promise<void> {
    const pending = this.campaignPendingCreation();
    if (!pending || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.error.set(null);
    try {
      const campaign = await this.campaignService.createAndActivate(pending);
      this.campaignPendingCreation.set(null);
      await this.router.navigate(['/campaigns', campaign.id]);
    } catch (error) {
      this.error.set(this.errorMessage(error));
      this.isSubmitting.set(false);
    }
  }

  protected async selectSystem(value: string | number | null): Promise<void> {
    const gameSystemId = typeof value === 'string' ? value : '';
    this.campaignForm.controls.gameSystemId.setValue(gameSystemId);
    await this.loadUniverses(gameSystemId);
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

  private async initialize(): Promise<void> {
    try {
      const systems = await this.gameSystemService.listSystems();
      this.gameSystems.set(systems);
      const firstSystemId = systems[0]?.id ?? '';
      this.campaignForm.controls.gameSystemId.setValue(firstSystemId);
      await Promise.all([this.loadCampaigns(), this.loadUniverses(firstSystemId)]);
    } catch (error) {
      this.error.set(this.errorMessage(error));
      this.isLoading.set(false);
    }
  }

  private async loadUniverses(gameSystemId: string): Promise<void> {
    const universes = gameSystemId
      ? await this.gameSystemService.listUniverses(gameSystemId)
      : [];
    this.universes.set(universes);
    this.campaignForm.controls.universeId.setValue(universes[0]?.id ?? '');
  }

  private resetCampaignForm(): void {
    const gameSystemId = this.gameSystems()[0]?.id ?? '';
    this.campaignForm.reset({
      name: '',
      description: '',
      gameSystemId,
      universeId: this.universes()[0]?.id ?? '',
    });
    this.campaignForm.markAsPristine();
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return "Une erreur inattendue empêche d'accéder aux campagnes.";
  }
}
