import {
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  inject,
  InjectionToken,
  input,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import cytoscape from 'cytoscape';

import type { CampaignMap } from '@app/features/campaign-map/domain/campaign-map';
import {
  buildVisibleCampaignMapGraph,
  type CampaignMapGraph,
  type CampaignMapGraphNode,
} from '@app/features/campaign-map/domain/campaign-map-graph';
import { resourceRouteSegment } from '@app/shared/rich-text-editor/resource-mention';

export type CampaignMapVariant = 'full' | 'compact';

type CytoscapeFactory = (options: cytoscape.CytoscapeOptions) => cytoscape.Core;

export const CAMPAIGN_MAP_CYTOSCAPE_FACTORY = new InjectionToken<CytoscapeFactory>(
  'CAMPAIGN_MAP_CYTOSCAPE_FACTORY',
  { providedIn: 'root', factory: () => cytoscape },
);

@Component({
  selector: 'app-campaign-map-tree',
  templateUrl: './campaign-map-tree.html',
  styleUrl: './campaign-map-tree.scss',
})
export class CampaignMapTree implements AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly cytoscapeFactory = inject(CAMPAIGN_MAP_CYTOSCAPE_FACTORY);
  private readonly graphHost = viewChild.required<ElementRef<HTMLDivElement>>('graphHost');
  private readonly graphReady = signal(false);
  private readonly expandedChapterIds = new Set<string>();
  private readonly expandedSceneIds = new Set<string>();
  private graph: cytoscape.Core | null = null;
  private currentLayout: cytoscape.Layouts | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private pendingTap: ReturnType<typeof setTimeout> | null = null;
  private activeCampaignId: string | null = null;

  readonly map = input.required<CampaignMap>();
  readonly variant = input<CampaignMapVariant>('full');
  protected readonly visibleNodeCount = signal(0);

  private readonly mapEffect = effect(() => {
    const map = this.map();
    if (!this.graphReady()) return;
    if (map.campaignId !== this.activeCampaignId) {
      this.activeCampaignId = map.campaignId;
      this.expandedChapterIds.clear();
      this.expandedSceneIds.clear();
    }
    this.render(map);
  });

  ngAfterViewInit(): void {
    const container = this.graphHost().nativeElement;
    this.graph = this.cytoscapeFactory({
      container,
      elements: [],
      style: GRAPH_STYLES,
      minZoom: 0.35,
      maxZoom: 2.5,
      boxSelectionEnabled: false,
    });
    this.bindGraphEvents(container);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.graph?.resize());
      this.resizeObserver.observe(container);
    }
    this.graphReady.set(true);
  }

  ngOnDestroy(): void {
    this.cancelPendingTap();
    this.currentLayout?.stop();
    this.resizeObserver?.disconnect();
    this.mapEffect.destroy();
    this.graph?.destroy();
  }

  protected zoomIn(): void {
    this.zoomBy(1.2);
  }

  protected zoomOut(): void {
    this.zoomBy(1 / 1.2);
  }

  protected fitGraph(): void {
    if (this.graph) this.graph.fit(this.graph.elements(), 40);
  }

  protected collapseAll(): void {
    this.expandedChapterIds.clear();
    this.expandedSceneIds.clear();
    this.render(this.map());
  }

  private bindGraphEvents(container: HTMLDivElement): void {
    if (!this.graph) return;
    this.graph.on('tap', 'node', (event) => {
      this.cancelPendingTap();
      const node = event.target as cytoscape.NodeSingular;
      this.pendingTap = setTimeout(() => this.toggleNode(node), DOUBLE_TAP_DELAY_MS);
    });
    this.graph.on('dbltap', 'node', (event) => {
      this.cancelPendingTap();
      this.openNode(event.target as cytoscape.NodeSingular);
    });
    this.graph.on('mouseover', 'node', () => {
      container.style.cursor = 'pointer';
    });
    this.graph.on('mouseout', 'node', () => {
      container.style.cursor = '';
    });
  }

  private toggleNode(node: cytoscape.NodeSingular): void {
    const kind = node.data('kind') as CampaignMapGraphNode['kind'];
    const resourceId = node.data('resourceId') as string | null;
    const expandable = node.data('expandable') as boolean;
    if (!expandable || !resourceId) return;

    if (kind === 'chapter') {
      if (this.expandedChapterIds.delete(resourceId)) {
        const chapter = this.map().chapters.find(({ id }) => id === resourceId);
        chapter?.scenes.forEach((scene) => this.expandedSceneIds.delete(scene.id));
      } else {
        this.expandedChapterIds.add(resourceId);
      }
    } else if (kind === 'scene') {
      if (!this.expandedSceneIds.delete(resourceId)) this.expandedSceneIds.add(resourceId);
    }
    this.render(this.map());
  }

  private openNode(node: cytoscape.NodeSingular): void {
    const kind = node.data('kind') as CampaignMapGraphNode['kind'];
    const resourceId = node.data('resourceId') as string | null;
    const available = node.data('available') as boolean;
    if (!available || !resourceId || kind === 'campaign') return;

    const segment = kind === 'chapter' ? 'chapters' : resourceRouteSegment(kind);
    void this.router.navigate(['/campaigns', this.map().campaignId, segment], {
      queryParams: { resourceId },
    });
  }

  private render(map: CampaignMap): void {
    if (!this.graph) return;
    const visibleGraph = buildVisibleCampaignMapGraph(
      map,
      this.expandedChapterIds,
      this.expandedSceneIds,
    );
    const previousPositions = new Map(
      this.graph.nodes().map((node) => [node.id(), node.position()] as const),
    );
    const hadNodes = previousPositions.size > 0;

    this.currentLayout?.stop();
    this.graph.elements().remove();
    this.graph.add(toCytoscapeElements(visibleGraph));
    this.restorePositions(visibleGraph, previousPositions);
    this.visibleNodeCount.set(visibleGraph.nodes.length);

    this.currentLayout = this.graph.layout({
      name: 'cose',
      animate: hadNodes && this.graph.container() !== null && !prefersReducedMotion(),
      animationDuration: 320,
      fit: true,
      padding: 48,
      randomize: !hadNodes,
      componentSpacing: 80,
      nodeRepulsion: 9000,
      nodeOverlap: 24,
      idealEdgeLength: 125,
      edgeElasticity: 90,
      gravity: 0.35,
      numIter: 800,
      nodeDimensionsIncludeLabels: true,
    });
    this.currentLayout.run();
  }

  private restorePositions(
    graph: CampaignMapGraph,
    previousPositions: ReadonlyMap<string, cytoscape.Position>,
  ): void {
    if (!this.graph || previousPositions.size === 0) return;
    graph.nodes.forEach((node, index) => {
      const element = this.graph?.getElementById(node.id);
      if (!element || element.empty()) return;
      const previous = previousPositions.get(node.id);
      if (previous) {
        element.position(previous);
        return;
      }
      const parentId = graph.edges.find(({ target }) => target === node.id)?.source;
      const parentPosition = parentId ? previousPositions.get(parentId) : null;
      if (parentPosition) {
        element.position({
          x: parentPosition.x + 36 + (index % 3) * 18,
          y: parentPosition.y + 36 + (index % 2) * 24,
        });
      }
    });
  }

  private zoomBy(factor: number): void {
    if (!this.graph) return;
    const container = this.graphHost().nativeElement;
    const level = Math.min(
      this.graph.maxZoom(),
      Math.max(this.graph.minZoom(), this.graph.zoom() * factor),
    );
    this.graph.zoom({
      level,
      renderedPosition: { x: container.clientWidth / 2, y: container.clientHeight / 2 },
    });
  }

  private cancelPendingTap(): void {
    if (this.pendingTap) clearTimeout(this.pendingTap);
    this.pendingTap = null;
  }
}

function toCytoscapeElements(graph: CampaignMapGraph): cytoscape.ElementDefinition[] {
  return [
    ...graph.nodes.map((node) => ({
      group: 'nodes' as const,
      data: node,
      classes: [
        `campaign-map-node--${node.kind}`,
        node.expandable ? 'campaign-map-node--expandable' : '',
        node.expanded ? 'campaign-map-node--expanded' : '',
        node.available ? '' : 'campaign-map-node--unavailable',
      ]
        .filter(Boolean)
        .join(' '),
    })),
    ...graph.edges.map((edge) => ({
      group: 'edges' as const,
      data: edge,
      classes: `campaign-map-edge--${edge.kind}`,
    })),
  ];
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const DOUBLE_TAP_DELAY_MS = 240;

const GRAPH_STYLES: cytoscape.StylesheetJson = [
  {
    selector: 'node',
    style: {
      width: 18,
      height: 18,
      label: 'data(label)',
      color: '#5d554c',
      'font-family': 'Inter, ui-sans-serif, system-ui, sans-serif',
      'font-size': 11,
      'font-weight': 500,
      'text-valign': 'bottom',
      'text-halign': 'center',
      'text-margin-y': 7,
      'text-wrap': 'wrap',
      'text-max-width': '140px',
      'background-color': '#85817a',
      'border-width': 2,
      'border-color': '#f3efe8',
      'overlay-opacity': 0,
    },
  },
  {
    selector: '.campaign-map-node--campaign',
    style: {
      width: 42,
      height: 42,
      'background-color': '#76538d',
      color: '#302b26',
      'font-size': 13,
      'font-weight': 700,
      'border-width': 4,
      'border-color': '#d8c5e2',
    },
  },
  {
    selector: '.campaign-map-node--chapter',
    style: { width: 30, height: 30, 'background-color': '#514e49', 'font-size': 12 },
  },
  {
    selector: '.campaign-map-node--scene',
    style: { width: 24, height: 24, 'background-color': '#77736c' },
  },
  {
    selector: '.campaign-map-node--expanded',
    style: {
      'background-color': '#76538d',
      'border-width': 4,
      'border-color': '#d8c5e2',
    },
  },
  {
    selector: '.campaign-map-node--unavailable',
    style: {
      'background-opacity': 0,
      'border-style': 'dashed',
      'border-color': '#9a555b',
      color: '#8a6f70',
    },
  },
  {
    selector: 'node:selected',
    style: { 'border-width': 4, 'border-color': '#b99352' },
  },
  {
    selector: 'edge',
    style: {
      width: 1.2,
      'line-color': '#b9b1a5',
      'curve-style': 'bezier',
      opacity: 0.78,
      'overlay-opacity': 0,
    },
  },
  {
    selector: '.campaign-map-edge--mention',
    style: { 'line-style': 'dashed', 'line-color': '#9b83a7' },
  },
  {
    selector: '.campaign-map-edge--resource',
    style: { 'line-color': '#c8bda9' },
  },
];
