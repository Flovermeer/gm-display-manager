import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, type ParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { CampaignContext } from '@app/features/campaigns/application/campaign-context';
import type { Campaign } from '@app/features/campaigns/domain/campaign';
import { RandomTableService } from '@app/features/random-tables/application/random-table.service';
import type {
  RandomTable,
  RandomTableInput,
} from '@app/features/random-tables/domain/random-table';
import { RandomTableWorkspace } from '@app/features/random-tables/pages/random-table-workspace/random-table-workspace';

describe('RandomTableWorkspace', () => {
  const campaign: Campaign = {
    id: 'campaign-id',
    name: 'Tomb of Annihilation',
    description: '',
    universeId: 'forgotten-realms',
    createdAt: '2026-08-20T12:00:00.000Z',
    updatedAt: '2026-08-20T12:00:00.000Z',
  };
  const table: RandomTable = {
    id: 'table-id',
    campaignId: campaign.id,
    name: 'Rencontres',
    description: 'Sur la route',
    entries: [
      { id: 'entry-1', minimum: 1, maximum: 2, resultText: 'Voyageurs' },
      { id: 'entry-2', minimum: 3, maximum: 4, resultText: 'Marchands' },
    ],
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
  const service = {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    roll: vi.fn(),
  };

  let queryParams: BehaviorSubject<ParamMap>;

  beforeEach(async () => {
    vi.clearAllMocks();
    queryParams = new BehaviorSubject(convertToParamMap({}));
    service.list.mockResolvedValue([table]);
    service.create.mockImplementation(async (_campaignId: string, input: RandomTableInput) => ({
      ...table,
      name: input.name,
      description: input.description,
      entries: input.entries.map((entry, index) => ({
        ...entry,
        id: entry.id ?? `entry-${index}`,
      })),
    }));
    service.roll.mockReturnValue({ value: 3, entry: table.entries[1] });

    await TestBed.configureTestingModule({
      imports: [RandomTableWorkspace],
      providers: [
        {
          provide: CampaignContext,
          useValue: { campaign: () => campaign, load: () => Promise.resolve(campaign) },
        },
        { provide: RandomTableService, useValue: service },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParams,
            get snapshot() {
              return { queryParamMap: queryParams.value };
            },
          },
        },
      ],
    }).compileComponents();
  });

  it('selects a table and displays the latest private roll', async () => {
    const fixture = TestBed.createComponent(RandomTableWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Rencontres');
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.random-table-list__entry')?.click();
    await renderUntil(fixture, 'Sur la route');
    findButton(element, 'Tirer').click();
    fixture.detectChanges();

    expect(service.roll).toHaveBeenCalledWith(table);
    expect(element.querySelector('.random-table-roll__result')?.textContent).toContain('Marchands');
  });

  it('opens the table targeted by a mention', async () => {
    queryParams.next(convertToParamMap({ resourceId: table.id }));
    const fixture = TestBed.createComponent(RandomTableWorkspace);
    fixture.detectChanges();

    await renderUntil(fixture, 'Sur la route');
    expect(findButton(fixture.nativeElement as HTMLElement, 'Tirer')).toBeTruthy();
  });

  it('sorts edited ranges before saving the complete table', async () => {
    const fixture = TestBed.createComponent(RandomTableWorkspace);
    fixture.detectChanges();
    await renderUntil(fixture, 'Rencontres');
    const element = fixture.nativeElement as HTMLElement;

    findButton(element, 'Nouvelle table').click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector('#random-table-name')).toBeTruthy();
    });
    setInput(element.querySelector<HTMLInputElement>('#random-table-name'), 'Trésors');
    findButton(element, 'Ajouter un résultat').click();
    findButton(element, 'Ajouter un résultat').click();
    fixture.detectChanges();

    let bounds = [...element.querySelectorAll<HTMLInputElement>('input[type="number"]')];
    setInput(bounds[0], '6');
    setInput(bounds[1], '10');
    setInput(bounds[2], '1');
    setInput(bounds[3], '5');
    bounds[3]?.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    bounds = [...element.querySelectorAll<HTMLInputElement>('input[type="number"]')];

    expect(bounds.map(({ value }) => value)).toEqual(['1', '5', '6', '10']);
    findButton(element, 'Enregistrer').click();
    await vi.waitFor(() => expect(service.create).toHaveBeenCalledOnce());
    expect(service.create).toHaveBeenCalledWith(
      campaign.id,
      expect.objectContaining({
        name: 'Trésors',
        entries: [
          expect.objectContaining({ minimum: 1, maximum: 5 }),
          expect.objectContaining({ minimum: 6, maximum: 10 }),
        ],
      }),
    );
  });
});

function findButton(element: HTMLElement, label: string): HTMLButtonElement {
  const button = [...element.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(label),
  );
  if (!button) throw new Error(`Button not found: ${label}`);
  return button;
}

function setInput(input: HTMLInputElement | undefined | null, value: string): void {
  if (!input) throw new Error(`Input not found for value: ${value}`);
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

async function renderUntil(
  fixture: ComponentFixture<RandomTableWorkspace>,
  text: string,
): Promise<void> {
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(text);
  });
}
