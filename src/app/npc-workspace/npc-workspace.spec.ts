import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import type { Campaign } from '../campaign/campaign';
import { CampaignService } from '../campaign/campaign.service';
import type { Npc } from '../npc/npc';
import { NpcService } from '../npc/npc.service';
import { NpcWorkspace } from './npc-workspace';

describe('NpcWorkspace', () => {
  const campaign: Campaign = {
    id: 'campaign-id',
    name: 'Tomb of Annihilation',
    description: '',
    systemKey: 'dnd5e',
    createdAt: '2026-08-12T18:30:00.000Z',
    updatedAt: '2026-08-12T18:30:00.000Z',
  };
  const npc: Npc = {
    id: 'npc-id',
    campaignId: campaign.id,
    name: 'Syndra Silvane',
    status: 'active',
    summary: 'Commanditaire',
    notes: '',
    sheet: {},
    sheetSchemaVersion: 1,
    createdAt: '2026-08-12T18:30:00.000Z',
    updatedAt: '2026-08-12T18:30:00.000Z',
  };
  const campaignService = {
    findById: vi.fn(),
    activate: vi.fn(),
  };
  const npcService = {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    campaignService.findById.mockResolvedValue(campaign);
    campaignService.activate.mockResolvedValue(undefined);
    npcService.list.mockResolvedValue([npc]);
    npcService.create.mockResolvedValue(npc);
    npcService.update.mockResolvedValue(npc);
    npcService.delete.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [NpcWorkspace],
      providers: [
        provideRouter([]),
        { provide: CampaignService, useValue: campaignService },
        { provide: NpcService, useValue: npcService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => campaign.id } } },
        },
      ],
    }).compileComponents();
  });

  it('shows the campaign NPC list in read-only mode', async () => {
    const fixture = TestBed.createComponent(NpcWorkspace);
    fixture.detectChanges();

    await renderUntil(fixture, 'Syndra Silvane');

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.npc-list-item')).toBeTruthy();
    expect(element.textContent).toContain('Aucun PNJ sélectionné');
  });

  it('asks what to do before leaving a dirty form', async () => {
    const fixture = TestBed.createComponent(NpcWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Syndra Silvane');

    const createButton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.create-button',
    );
    createButton?.click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(
        (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#npc-name'),
      ).toBeTruthy();
    });
    const nameInput = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#npc-name',
    );
    if (!nameInput) {
      throw new Error('NPC name field not found.');
    }
    nameInput.value = 'Nouveau PNJ';
    nameInput.dispatchEvent(new Event('input'));

    const result = fixture.componentInstance.canDeactivate();
    fixture.detectChanges();

    expect(result).toBeInstanceOf(Promise);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Enregistrer et quitter');
    const continueButton = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        '.dialog button',
      ),
    ].find((button) => button.textContent?.includes('Continuer'));
    continueButton?.click();
    await expect(result).resolves.toBe(false);
  });
});

async function renderUntil(fixture: ComponentFixture<NpcWorkspace>, text: string) {
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(text);
  });
}
