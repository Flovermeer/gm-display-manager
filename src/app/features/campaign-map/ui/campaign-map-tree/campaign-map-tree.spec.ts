import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type cytoscape from 'cytoscape';

import type { CampaignMap } from '@app/features/campaign-map/domain/campaign-map';
import {
  CAMPAIGN_MAP_CYTOSCAPE_FACTORY,
  CampaignMapTree,
} from '@app/features/campaign-map/ui/campaign-map-tree/campaign-map-tree';

describe('CampaignMapTree', () => {
  let graph: FakeCytoscape;

  beforeEach(async () => {
    graph = new FakeCytoscape();
    await TestBed.configureTestingModule({
      imports: [CampaignMapTree],
      providers: [
        provideRouter([]),
        { provide: CAMPAIGN_MAP_CYTOSCAPE_FACTORY, useValue: () => graph },
      ],
    }).compileComponents();
  });

  it('starts with the campaign and chapter nodes in an interactive canvas', async () => {
    const fixture = TestBed.createComponent(CampaignMapTree);
    fixture.componentRef.setInput('map', map);
    fixture.detectChanges();

    await vi.waitFor(() =>
      expect(graph.nodeIds()).toEqual(['campaign:campaign-id', 'chapter:chapter-id']),
    );
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.campaign-map__graph'),
    ).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('2 nœuds visibles');
  });

  it('reveals a chapter and scene progressively on single taps', async () => {
    const fixture = TestBed.createComponent(CampaignMapTree);
    fixture.componentRef.setInput('map', map);
    fixture.detectChanges();
    await vi.waitFor(() => expect(graph.nodeIds()).toContain('chapter:chapter-id'));
    vi.useFakeTimers();

    graph.trigger('tap', 'chapter:chapter-id');
    await vi.advanceTimersByTimeAsync(240);
    expect(graph.nodeIds()).toEqual([
      'campaign:campaign-id',
      'chapter:chapter-id',
      'scene:scene-id',
      'npc:npc-id',
      'item:missing-item',
    ]);

    graph.trigger('tap', 'scene:scene-id');
    await vi.advanceTimersByTimeAsync(240);
    expect(graph.nodeIds()).toContain('location:location-id');
    vi.useRealTimers();
  });

  it('opens the resource sheet on a double tap without expanding it', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(CampaignMapTree);
    fixture.componentRef.setInput('map', map);
    fixture.detectChanges();
    await vi.waitFor(() => expect(graph.nodeIds()).toContain('chapter:chapter-id'));

    graph.trigger('dbltap', 'chapter:chapter-id');

    expect(navigate).toHaveBeenCalledWith(['/campaigns', map.campaignId, 'chapters'], {
      queryParams: { resourceId: 'chapter-id' },
    });
    expect(graph.nodeIds()).toEqual(['campaign:campaign-id', 'chapter:chapter-id']);
  });

  it('uses the compact viewport variant', () => {
    const fixture = TestBed.createComponent(CampaignMapTree);
    fixture.componentRef.setInput('map', map);
    fixture.componentRef.setInput('variant', 'compact');
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.campaign-map--compact'),
    ).toBeTruthy();
  });
});

class FakeCytoscape {
  private readonly handlers = new Map<string, (event: { target: FakeNode }) => void>();
  private graphNodes: FakeNode[] = [];
  private definitions: cytoscape.ElementDefinition[] = [];
  private zoomLevel = 1;

  on(event: string, selector: string, handler: (event: { target: FakeNode }) => void): this {
    this.handlers.set(`${event}:${selector}`, handler);
    return this;
  }

  nodes(): cytoscape.NodeCollection {
    return this.graphNodes as unknown as cytoscape.NodeCollection;
  }

  elements(): cytoscape.CollectionReturnValue {
    return {
      remove: () => {
        this.graphNodes = [];
        this.definitions = [];
      },
    } as unknown as cytoscape.CollectionReturnValue;
  }

  add(definitions: cytoscape.ElementDefinition[]): cytoscape.CollectionReturnValue {
    this.definitions = definitions;
    this.graphNodes = definitions
      .filter(({ group }) => group === 'nodes')
      .map(({ data }) => new FakeNode(data as Record<string, unknown>));
    return this.graphNodes as unknown as cytoscape.CollectionReturnValue;
  }

  layout(): cytoscape.Layouts {
    return { run: () => undefined, stop: () => undefined } as unknown as cytoscape.Layouts;
  }

  getElementById(id: string): cytoscape.SingularElementReturnValue {
    return (this.graphNodes.find((node) => node.id() === id) ??
      new EmptyNode()) as unknown as cytoscape.SingularElementReturnValue;
  }

  fit(): this {
    return this;
  }

  container(): HTMLElement | null {
    return null;
  }

  resize(): this {
    return this;
  }

  destroy(): void {
    // Rien à libérer dans ce double de test.
  }

  minZoom(): number {
    return 0.35;
  }

  maxZoom(): number {
    return 2.5;
  }

  zoom(value?: number | cytoscape.ZoomOptions): number | this {
    if (typeof value === 'object') {
      this.zoomLevel = value.level;
      return this;
    }
    if (typeof value === 'number') {
      this.zoomLevel = value;
      return this;
    }
    return this.zoomLevel;
  }

  nodeIds(): string[] {
    return this.graphNodes.map((node) => node.id());
  }

  trigger(event: string, nodeId: string): void {
    const node = this.graphNodes.find((candidate) => candidate.id() === nodeId);
    if (!node) throw new Error(`Missing fake node ${nodeId}`);
    this.handlers.get(`${event}:node`)?.({ target: node });
  }
}

class FakeNode {
  private currentPosition: cytoscape.Position = { x: 0, y: 0 };

  constructor(private readonly nodeData: Record<string, unknown>) {}

  id(): string {
    return this.nodeData['id'] as string;
  }

  data(key: string): unknown {
    return this.nodeData[key];
  }

  position(value?: cytoscape.Position): cytoscape.Position | this {
    if (value) {
      this.currentPosition = value;
      return this;
    }
    return this.currentPosition;
  }

  empty(): boolean {
    return false;
  }
}

class EmptyNode extends FakeNode {
  constructor() {
    super({ id: '' });
  }

  override empty(): boolean {
    return true;
  }
}

const map: CampaignMap = {
  campaignId: 'campaign-id',
  campaignName: 'Tomb of Annihilation',
  sceneCount: 1,
  chapters: [
    {
      id: 'chapter-id',
      title: 'Le port',
      summary: 'Arrivée à Chult',
      mentions: [
        {
          resourceType: 'npc',
          resourceId: 'npc-id',
          label: 'Syndra Silvane',
          available: true,
        },
        {
          resourceType: 'item',
          resourceId: 'missing-item',
          label: 'Ancien objet',
          available: false,
        },
      ],
      scenes: [
        {
          id: 'scene-id',
          name: 'La taverne',
          summary: 'Première rencontre',
          resources: [
            {
              resourceType: 'location',
              resourceId: 'location-id',
              label: 'Port Nyanzaru',
              available: true,
            },
          ],
        },
      ],
    },
  ],
};
