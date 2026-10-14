import { Extension, mergeAttributes, Node, type JSONContent } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const RESOURCE_TYPES = [
  'player-character',
  'npc',
  'monster',
  'location',
  'item',
  'scene',
] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export type ResourceMentionCandidate = Readonly<{
  resourceType: ResourceType;
  resourceId: string;
  label: string;
  playerDisplayAvailable?: boolean;
}>;

export type ResourceMentionMatch = Readonly<{
  from: number;
  to: number;
  query: string;
}>;

const RESOURCE_TYPE_LABELS: Readonly<Record<ResourceType, string>> = {
  'player-character': 'PJ',
  npc: 'PNJ',
  monster: 'Monstre',
  location: 'Lieu',
  item: 'Objet',
  scene: 'Scène',
};

const RESOURCE_ROUTE_SEGMENTS: Readonly<Record<ResourceType, string>> = {
  'player-character': 'player-characters',
  npc: 'npcs',
  monster: 'bestiary',
  location: 'locations',
  item: 'items',
  scene: 'scenes',
};

type ResourceMentionExtensionOptions = Readonly<{
  isAvailable: (resourceType: ResourceType, resourceId: string) => boolean;
  displayState: (
    resourceType: ResourceType,
    resourceId: string,
  ) => 'hidden' | 'disabled' | 'enabled' | 'active' | 'busy';
}>;

export function createResourceMentionExtension(options: ResourceMentionExtensionOptions): Node {
  return Node.create({
    name: 'resourceMention',
    group: 'inline',
    inline: true,
    atom: true,
    selectable: false,

    addAttributes() {
      return {
        resourceType: { default: null },
        resourceId: { default: null },
        label: { default: '' },
      };
    },

    parseHTML() {
      return [{ tag: 'span[data-resource-mention]' }];
    },

    renderHTML({ node, HTMLAttributes }) {
      const resourceType = node.attrs['resourceType'] as ResourceType;
      const resourceId = node.attrs['resourceId'] as string;
      const label = node.attrs['label'] as string;
      const available = options.isAvailable(resourceType, resourceId);
      const displayState = options.displayState(resourceType, resourceId);
      if (!available) {
        return [
          'span',
          mergeAttributes(HTMLAttributes, {
            'data-resource-mention': 'broken',
            class: 'resource-mention-broken',
          }),
          `@${label}`,
        ];
      }
      const displayDisabled = displayState === 'disabled' || displayState === 'busy';
      const displayActive = displayState === 'active';
      return [
        'span',
        mergeAttributes(HTMLAttributes, {
          'data-resource-mention': 'resolved',
          'data-resource-type': resourceType,
          'data-resource-id': resourceId,
          class: 'resource-mention-shell',
        }),
        [
          'span',
          {
            'data-resource-mention-open': '',
            class: 'resource-mention',
            role: 'link',
            tabindex: '0',
          },
          `@${label}`,
        ],
        ...(displayState === 'hidden'
          ? []
          : [
              [
                'button',
                {
                  type: 'button',
                  'data-resource-mention-display': '',
                  class: `resource-mention-display${displayActive ? ' active' : ''}`,
                  contenteditable: 'false',
                  disabled: displayDisabled ? 'disabled' : null,
                  'aria-label': displayActive
                    ? `Arrêter l’affichage de ${label}`
                    : `Afficher ${label} aux joueurs`,
                  'aria-pressed': displayActive ? 'true' : 'false',
                  title: displayDisabled
                    ? 'Ouvre d’abord l’écran joueurs depuis la régie.'
                    : displayActive
                      ? 'Arrêter l’affichage'
                      : 'Afficher aux joueurs',
                },
                [
                  'svg',
                  { viewBox: '0 0 24 24', 'aria-hidden': 'true' },
                  [
                    'path',
                    {
                      d: 'M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z',
                    },
                  ],
                  ['circle', { cx: '12', cy: '12', r: '2.75' }],
                ],
              ],
            ]),
      ];
    },

    renderText({ node }) {
      return `@${node.attrs['label'] as string}`;
    },
  });
}

export function createResourceMentionTrigger(
  onMatch: (match: ResourceMentionMatch | null) => void,
  onKeyDown: (event: KeyboardEvent) => boolean,
): Extension {
  return Extension.create({
    name: 'resourceMentionTrigger',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey('resourceMentionTrigger'),
          view: (view) => {
            publishMentionMatch(view.state.selection.$from, view.state.selection.empty, onMatch);
            return {
              update: (nextView) =>
                publishMentionMatch(
                  nextView.state.selection.$from,
                  nextView.state.selection.empty,
                  onMatch,
                ),
              destroy: () => onMatch(null),
            };
          },
          props: {
            handleKeyDown: (_view, event) => onKeyDown(event),
          },
        }),
      ];
    },
  });
}

export function extractResourceMentions(content: JSONContent): readonly ResourceMentionCandidate[] {
  const mentions = new Map<string, ResourceMentionCandidate>();
  visitContent(content, (node) => {
    if (node.type !== 'resourceMention') return;
    const resourceType = node.attrs?.['resourceType'];
    const resourceId = node.attrs?.['resourceId'];
    const label = node.attrs?.['label'];
    if (
      !isResourceType(resourceType) ||
      typeof resourceId !== 'string' ||
      typeof label !== 'string'
    )
      return;
    mentions.set(`${resourceType}:${resourceId}`, { resourceType, resourceId, label });
  });
  return [...mentions.values()];
}

export function resourceTypeLabel(resourceType: ResourceType): string {
  return RESOURCE_TYPE_LABELS[resourceType];
}

export function resourceRouteSegment(resourceType: ResourceType): string {
  return RESOURCE_ROUTE_SEGMENTS[resourceType];
}

function publishMentionMatch(
  position: {
    parent: { textBetween: (from: number, to: number) => string };
    parentOffset: number;
    pos: number;
  },
  selectionIsEmpty: boolean,
  onMatch: (match: ResourceMentionMatch | null) => void,
): void {
  if (!selectionIsEmpty) {
    onMatch(null);
    return;
  }
  const startOffset = Math.max(0, position.parentOffset - 80);
  const textBefore = position.parent.textBetween(startOffset, position.parentOffset);
  const match = /(?:^|\s)@([\p{L}\p{N}'’ -]*)$/u.exec(textBefore);
  if (!match) {
    onMatch(null);
    return;
  }
  const query = match[1];
  onMatch({ from: position.pos - query.length - 1, to: position.pos, query });
}

function visitContent(node: JSONContent, visitor: (node: JSONContent) => void): void {
  visitor(node);
  node.content?.forEach((child) => visitContent(child, visitor));
}

function isResourceType(value: unknown): value is ResourceType {
  return typeof value === 'string' && RESOURCE_TYPES.includes(value as ResourceType);
}
