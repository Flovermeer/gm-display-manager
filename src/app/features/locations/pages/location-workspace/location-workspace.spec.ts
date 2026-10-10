import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import type { Campaign } from '@app/features/campaigns/domain/campaign';
import { CampaignService } from '@app/features/campaigns/application/campaign.service';
import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import { DisplayGateway } from '@app/features/display/data-access/display.gateway';
import type { Location } from '@app/features/locations/domain/location';
import { LocationService } from '@app/features/locations/application/location.service';
import { JournalEntryService } from '@app/features/journal/application/journal-entry.service';
import { LocationImageGateway } from '@app/features/locations/data-access/location-image.gateway';
import { LocationWorkspace } from '@app/features/locations/pages/location-workspace/location-workspace';
import { ResourceMentionNavigationService } from '@app/shared/rich-text-editor/resource-mention-navigation.service';
import { ActiveSceneService } from '@app/features/scenes/application/active-scene.service';
import { createEmptyRichTextDocument } from '@app/shared/rich-text-editor/rich-text-document';
import { AppSettingRepository } from '@app/core/persistence/app-setting.repository';
import { InMemoryAppSettingRepository } from '@app/core/persistence/in-memory-app-setting.repository';
import { LocationTreeStateService } from '@app/features/locations/application/location-tree-state.service';

describe('LocationWorkspace', () => {
  const campaign: Campaign = {
    id: 'campaign-id',
    name: 'Tomb of Annihilation',
    description: '',
    universeId: 'forgotten-realms',
    createdAt: '2026-08-12T18:30:00.000Z',
    updatedAt: '2026-08-12T18:30:00.000Z',
  };
  const chult = location({ id: 'chult-id', name: 'Chult' });
  const port = location({
    id: 'port-id',
    name: 'Port Nyanzaru',
    parentLocationId: chult.id,
    summary: 'Cité portuaire',
  });
  const campaignService = {
    findById: vi.fn(),
    activate: vi.fn(),
  };
  const locationService = {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const journalEntryService = {
    listForTarget: vi.fn(),
    listGlobal: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const imageGateway = {
    chooseAndImport: vi.fn(),
    resolveUrl: vi.fn(),
    discard: vi.fn(),
  };
  const displayGateway = {
    isDesktop: true,
    isPlayerDisplayOpen: vi.fn(),
    sendPlayerDisplayState: vi.fn(),
  };
  const activeSceneService = { clear: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    campaignService.findById.mockResolvedValue(campaign);
    campaignService.activate.mockResolvedValue(undefined);
    locationService.list.mockResolvedValue([port, chult]);
    locationService.create.mockResolvedValue(chult);
    locationService.update.mockResolvedValue(chult);
    locationService.delete.mockResolvedValue(undefined);
    journalEntryService.listForTarget.mockResolvedValue([]);
    journalEntryService.listGlobal.mockResolvedValue([]);
    imageGateway.chooseAndImport.mockResolvedValue([]);
    imageGateway.resolveUrl.mockResolvedValue('asset://location');
    imageGateway.discard.mockResolvedValue(undefined);
    displayGateway.isPlayerDisplayOpen.mockResolvedValue(true);
    displayGateway.sendPlayerDisplayState.mockResolvedValue(undefined);
    activeSceneService.clear.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [LocationWorkspace],
      providers: [
        provideRouter([]),
        { provide: CampaignService, useValue: campaignService },
        {
          provide: CampaignContext,
          useValue: { campaign: () => campaign, load: () => Promise.resolve(campaign) },
        },
        { provide: LocationService, useValue: locationService },
        { provide: JournalEntryService, useValue: journalEntryService },
        {
          provide: ResourceMentionNavigationService,
          useValue: { listCandidates: () => Promise.resolve([]), open: vi.fn() },
        },
        { provide: LocationImageGateway, useValue: imageGateway },
        { provide: DisplayGateway, useValue: displayGateway },
        { provide: ActiveSceneService, useValue: activeSceneService },
        { provide: AppSettingRepository, useClass: InMemoryAppSettingRepository },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => campaign.id } } },
        },
      ],
    }).compileComponents();
  });

  it('renders locations in hierarchical order', async () => {
    const fixture = TestBed.createComponent(LocationWorkspace);
    fixture.detectChanges();

    await renderUntil(fixture, 'Port Nyanzaru');

    const items = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '.location-list-item',
      ),
    ];
    expect(items.map((item) => item.querySelector('strong')?.textContent?.trim())).toEqual([
      'Chult',
      'Port Nyanzaru',
    ]);
    expect(
      items[1]
        .closest<HTMLElement>('.location-list-row')
        ?.style.getPropertyValue('--location-depth'),
    ).toBe('1');
  });

  it('collapses a location branch without selecting the parent and persists it', async () => {
    const fixture = TestBed.createComponent(LocationWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Port Nyanzaru');
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.location-tree-toggle')?.click();

    await vi.waitFor(async () => {
      fixture.detectChanges();
      expect(element.textContent).not.toContain('Port Nyanzaru');
      expect(element.querySelector('.location-list-row--collapsed')).toBeTruthy();
      await expect(TestBed.inject(LocationTreeStateService).load(campaign.id)).resolves.toEqual(
        new Set([chult.id]),
      );
    });
    expect(element.querySelector('.location-list-item.active')).toBeNull();
  });

  it('restores collapsed branches but exposes their matches while searching', async () => {
    await TestBed.inject(LocationTreeStateService).save(campaign.id, new Set([chult.id]));
    const fixture = TestBed.createComponent(LocationWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Chult');
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).not.toContain('Port Nyanzaru');
    const search = element.querySelector<HTMLInputElement>('#location-search');
    if (!search) throw new Error('Location search field not found.');
    search.value = 'Port';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(element.textContent).toContain('Port Nyanzaru');
    expect(element.textContent).toContain('Chult › Port Nyanzaru');
    expect(element.querySelector('.location-tree-toggle')).toBeNull();

    search.value = '';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(element.textContent).not.toContain('Port Nyanzaru');
  });

  it('asks what to do before leaving a dirty form', async () => {
    const fixture = TestBed.createComponent(LocationWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Port Nyanzaru');
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.create-button')?.click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector<HTMLInputElement>('#location-name')).toBeTruthy();
    });
    const nameInput = element.querySelector<HTMLInputElement>('#location-name');
    if (!nameInput) {
      throw new Error('Location name field not found.');
    }
    nameInput.value = "Beholder's Inn";
    nameInput.dispatchEvent(new Event('input'));

    const result = fixture.componentInstance.canDeactivate();
    fixture.detectChanges();

    expect(result).toBeInstanceOf(Promise);
    expect(element.textContent).toContain('Enregistrer et quitter');
    const continueButton = [...element.querySelectorAll<HTMLButtonElement>('.dialog button')].find(
      (button) => button.textContent?.includes('Continuer'),
    );
    continueButton?.click();
    await expect(result).resolves.toBe(false);
  });

  it('previews an imported illustration while editing', async () => {
    imageGateway.chooseAndImport.mockResolvedValue([
      'campaigns/campaign-id/media/locations/port.webp',
    ]);
    const fixture = TestBed.createComponent(LocationWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Port Nyanzaru');
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.location-list-item')?.click();
    await renderUntil(fixture, 'Modifier');
    element.querySelector<HTMLButtonElement>('.detail-actions .ui-button--primary')?.click();
    fixture.detectChanges();
    [...element.querySelectorAll<HTMLButtonElement>('.location-gallery__actions button')]
      .find((button) => button.textContent?.includes('Ajouter'))
      ?.click();

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector<HTMLImageElement>('.location-image-frame img')?.src).toContain(
        'asset://location',
      );
    });
  });

  it('navigates the gallery, opens the viewer and displays the current image', async () => {
    const imagePaths = [
      'universes/forgotten-realms/media/locations/port.webp',
      'universes/forgotten-realms/media/locations/port-map.webp',
    ];
    const galleryPort = location({ ...port, imagePaths, imagePath: imagePaths[0] });
    locationService.list.mockResolvedValue([chult, galleryPort]);
    imageGateway.resolveUrl.mockImplementation((path: string) =>
      Promise.resolve(`asset://${path}`),
    );
    const fixture = TestBed.createComponent(LocationWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Port Nyanzaru');
    const element = fixture.nativeElement as HTMLElement;

    element.querySelectorAll<HTMLButtonElement>('.location-list-item')[1]?.click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.textContent).toContain('1 / 2');
    });
    element.querySelectorAll<HTMLButtonElement>('.location-gallery__arrow')[1]?.click();
    fixture.detectChanges();
    expect(element.textContent).toContain('2 / 2');
    expect(element.querySelector<HTMLImageElement>('.location-image-frame img')?.src).toContain(
      'port-map.webp',
    );

    element.querySelector<HTMLButtonElement>('.location-image-frame')?.click();
    fixture.detectChanges();
    expect(element.querySelector('.media-viewer')).toBeTruthy();
    element.querySelector<HTMLButtonElement>('.media-viewer__close')?.click();
    element.querySelector<HTMLButtonElement>('.display-button')?.click();

    await vi.waitFor(() => {
      expect(displayGateway.sendPlayerDisplayState).toHaveBeenCalledWith(
        expect.objectContaining({ imagePath: `asset://${imagePaths[1]}` }),
      );
    });
  });

  it('returns the player display to neutral when its gallery image is deleted', async () => {
    const imagePath = 'universes/forgotten-realms/media/locations/port.webp';
    const illustratedPort = location({ ...port, imagePaths: [imagePath], imagePath });
    locationService.list.mockResolvedValue([chult, illustratedPort]);
    imageGateway.resolveUrl.mockResolvedValue(`asset://${imagePath}`);
    const fixture = TestBed.createComponent(LocationWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Port Nyanzaru');
    const element = fixture.nativeElement as HTMLElement;

    element.querySelectorAll<HTMLButtonElement>('.location-list-item')[1]?.click();
    await renderUntil(fixture, 'Afficher aux joueurs');
    element.querySelector<HTMLButtonElement>('.display-button')?.click();
    await renderUntil(fixture, 'Arrêter l’affichage');
    element.querySelector<HTMLButtonElement>('.detail-actions .ui-button--primary')?.click();
    fixture.detectChanges();
    [...element.querySelectorAll<HTMLButtonElement>('.location-gallery__actions button')]
      .find((button) => button.textContent?.includes('Supprimer'))
      ?.click();
    fixture.detectChanges();
    [...element.querySelectorAll<HTMLButtonElement>('.dialog button')]
      .find((button) => button.textContent?.includes('Supprimer l’image'))
      ?.click();

    await vi.waitFor(() => {
      expect(displayGateway.sendPlayerDisplayState).toHaveBeenLastCalledWith({ mode: 'neutral' });
    });
  });

  it('uses the demo illustration on the player display when no image is persisted', async () => {
    const fixture = TestBed.createComponent(LocationWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Port Nyanzaru');
    const element = fixture.nativeElement as HTMLElement;

    element.querySelectorAll<HTMLButtonElement>('.location-list-item')[1]?.click();
    await renderUntil(fixture, 'Afficher aux joueurs');
    expect(element.querySelector('.portrait-demo-label')?.textContent).toContain('Démo');
    element.querySelector<HTMLButtonElement>('.display-button')?.click();

    await vi.waitFor(() => {
      expect(displayGateway.sendPlayerDisplayState).toHaveBeenCalledWith({
        mode: 'location',
        locationId: port.id,
        name: port.name,
        imagePath: '/demo/tavern.svg',
      });
    });

    await renderUntil(fixture, 'Arrêter l’affichage');
    element.querySelector<HTMLButtonElement>('.display-button')?.click();

    await vi.waitFor(() => {
      expect(displayGateway.sendPlayerDisplayState).toHaveBeenLastCalledWith({ mode: 'neutral' });
    });
    expect(activeSceneService.clear).toHaveBeenCalledWith(campaign.id);
  });

  it('renders the campaign detailed description in read-only mode', async () => {
    const detailedPort = location({
      ...port,
      description: {
        schemaVersion: 1,
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Les quais sont surveillés par les Zhentarim.' }],
            },
          ],
        },
      },
    });
    locationService.list.mockResolvedValue([chult, detailedPort]);
    const fixture = TestBed.createComponent(LocationWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Port Nyanzaru');
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
      '.location-list-item',
    );
    buttons[1]?.click();

    await renderUntil(fixture, 'Les quais sont surveillés par les Zhentarim.');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Description détaillée');
  });
});

function location(overrides: Partial<Location>): Location {
  return {
    id: 'location-id',
    campaignId: 'campaign-id',
    provenance: 'campaign',
    parentLocationId: null,
    name: 'Lieu',
    summary: '',
    description: createEmptyRichTextDocument(),
    notes: '',
    imagePaths: [],
    imagePath: null,
    createdAt: '2026-08-12T18:30:00.000Z',
    updatedAt: '2026-08-12T18:30:00.000Z',
    ...overrides,
  };
}

async function renderUntil(fixture: ComponentFixture<LocationWorkspace>, text: string) {
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(text);
  });
}
