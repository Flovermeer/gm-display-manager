import type {
  CampaignMap,
  CampaignMapResource,
  CampaignMapScene,
} from '@app/features/campaign-map/domain/campaign-map';
import type { ResourceType } from '@app/shared/rich-text-editor/resource-mention';

export type CampaignMapGraphNodeKind = 'campaign' | 'chapter' | ResourceType;
export type CampaignMapGraphEdgeKind = 'structure' | 'mention' | 'resource';

export type CampaignMapGraphNode = Readonly<{
  id: string;
  label: string;
  kind: CampaignMapGraphNodeKind;
  resourceId: string | null;
  available: boolean;
  expandable: boolean;
  expanded: boolean;
}>;

export type CampaignMapGraphEdge = Readonly<{
  id: string;
  source: string;
  target: string;
  kind: CampaignMapGraphEdgeKind;
}>;

export type CampaignMapGraph = Readonly<{
  nodes: readonly CampaignMapGraphNode[];
  edges: readonly CampaignMapGraphEdge[];
}>;

export function buildVisibleCampaignMapGraph(
  map: CampaignMap,
  expandedChapterIds: ReadonlySet<string>,
  expandedSceneIds: ReadonlySet<string>,
): CampaignMapGraph {
  const nodes = new Map<string, CampaignMapGraphNode>();
  const edges = new Map<string, CampaignMapGraphEdge>();
  const rootId = campaignNodeId(map.campaignId);
  const scenes = new Map(
    map.chapters.flatMap((chapter) => chapter.scenes.map((scene) => [scene.id, scene] as const)),
  );

  addNode(nodes, {
    id: rootId,
    label: map.campaignName,
    kind: 'campaign',
    resourceId: null,
    available: true,
    expandable: false,
    expanded: true,
  });

  for (const chapter of map.chapters) {
    const chapterId = chapterNodeId(chapter.id);
    const chapterExpanded = expandedChapterIds.has(chapter.id);
    addNode(nodes, {
      id: chapterId,
      label: chapter.title,
      kind: 'chapter',
      resourceId: chapter.id,
      available: true,
      expandable: chapter.scenes.length > 0 || chapter.mentions.length > 0,
      expanded: chapterExpanded,
    });
    addEdge(edges, rootId, chapterId, 'structure');

    if (!chapterExpanded) continue;

    for (const scene of chapter.scenes) {
      addScene(nodes, scene, expandedSceneIds);
      addEdge(edges, chapterId, sceneNodeId(scene.id), 'structure');
    }

    for (const mention of chapter.mentions) {
      const mentionId = addResource(nodes, mention, scenes, expandedSceneIds);
      addEdge(edges, chapterId, mentionId, 'mention');
    }
  }

  for (const sceneId of expandedSceneIds) {
    const scene = scenes.get(sceneId);
    if (!scene || !nodes.has(sceneNodeId(sceneId))) continue;
    for (const resource of scene.resources) {
      const resourceId = addResource(nodes, resource, scenes, expandedSceneIds);
      addEdge(edges, sceneNodeId(scene.id), resourceId, 'resource');
    }
  }

  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

function addScene(
  nodes: Map<string, CampaignMapGraphNode>,
  scene: CampaignMapScene,
  expandedSceneIds: ReadonlySet<string>,
): void {
  addNode(nodes, {
    id: sceneNodeId(scene.id),
    label: scene.name,
    kind: 'scene',
    resourceId: scene.id,
    available: true,
    expandable: scene.resources.length > 0,
    expanded: expandedSceneIds.has(scene.id),
  });
}

function addResource(
  nodes: Map<string, CampaignMapGraphNode>,
  resource: CampaignMapResource,
  scenes: ReadonlyMap<string, CampaignMapScene>,
  expandedSceneIds: ReadonlySet<string>,
): string {
  if (resource.resourceType === 'scene') {
    const scene = scenes.get(resource.resourceId);
    if (scene && resource.available) {
      addScene(nodes, scene, expandedSceneIds);
      return sceneNodeId(scene.id);
    }
  }

  const id = resourceNodeId(resource.resourceType, resource.resourceId);
  addNode(nodes, {
    id,
    label: resource.label,
    kind: resource.resourceType,
    resourceId: resource.resourceId,
    available: resource.available,
    expandable: false,
    expanded: false,
  });
  return id;
}

function addNode(nodes: Map<string, CampaignMapGraphNode>, node: CampaignMapGraphNode): void {
  const existing = nodes.get(node.id);
  if (!existing || (!existing.available && node.available)) nodes.set(node.id, node);
}

function addEdge(
  edges: Map<string, CampaignMapGraphEdge>,
  source: string,
  target: string,
  kind: CampaignMapGraphEdgeKind,
): void {
  const id = `edge:${source}:${target}`;
  if (!edges.has(id)) edges.set(id, { id, source, target, kind });
}

function campaignNodeId(id: string): string {
  return `campaign:${id}`;
}

function chapterNodeId(id: string): string {
  return `chapter:${id}`;
}

function sceneNodeId(id: string): string {
  return resourceNodeId('scene', id);
}

function resourceNodeId(resourceType: ResourceType, id: string): string {
  return `${resourceType}:${id}`;
}
