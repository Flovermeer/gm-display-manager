import type { ResourceProvenance } from '@app/shared/domain/resource-provenance';
import {
  createEmptyRichTextDocument,
  type RichTextDocument,
} from '@app/shared/rich-text-editor/rich-text-document';

export type Location = Readonly<{
  id: string;
  campaignId: string;
  provenance: ResourceProvenance;
  parentLocationId: string | null;
  name: string;
  summary: string;
  description: RichTextDocument;
  notes: string;
  hideNameOnPlayerDisplay: boolean;
  imagePaths: readonly string[];
  imagePath: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type CreateLocationInput = Readonly<{
  campaignId: string;
  parentLocationId?: string | null;
  name: string;
  summary?: string;
  description?: RichTextDocument;
  notes?: string;
  hideNameOnPlayerDisplay?: boolean;
  imagePaths?: readonly string[];
  imagePath?: string | null;
}>;

export type UpdateLocationInput = Readonly<{
  parentLocationId: string | null;
  name: string;
  summary: string;
  description?: RichTextDocument;
  notes: string;
  hideNameOnPlayerDisplay?: boolean;
}>;

export type LocationFactoryDependencies = Readonly<{
  createId: () => string;
  now: () => Date;
}>;

const defaultDependencies: LocationFactoryDependencies = {
  createId: () => crypto.randomUUID(),
  now: () => new Date(),
};

export function createLocation(
  input: CreateLocationInput,
  dependencies: LocationFactoryDependencies = defaultDependencies,
): Location {
  const now = dependencies.now().toISOString();
  const imagePaths = normalizeImagePaths(
    input.imagePaths ?? (input.imagePath ? [input.imagePath] : []),
  );

  return {
    id: dependencies.createId(),
    campaignId: input.campaignId,
    provenance: 'campaign',
    parentLocationId: input.parentLocationId ?? null,
    name: requiredName(input.name),
    summary: input.summary?.trim() ?? '',
    description: input.description ?? createEmptyRichTextDocument(),
    notes: input.notes?.trim() ?? '',
    hideNameOnPlayerDisplay: input.hideNameOnPlayerDisplay ?? false,
    imagePaths,
    imagePath: imagePaths[0] ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateLocationImages(location: Location, imagePaths: readonly string[]): Location {
  const normalizedPaths = normalizeImagePaths(imagePaths);
  return {
    ...location,
    imagePaths: normalizedPaths,
    imagePath: normalizedPaths[0] ?? null,
  };
}

export function updateLocation(
  location: Location,
  input: UpdateLocationInput,
  now: () => Date = () => new Date(),
): Location {
  if (input.parentLocationId === location.id) {
    throw new Error('A location cannot be its own parent.');
  }

  return {
    ...location,
    parentLocationId: input.parentLocationId,
    name: requiredName(input.name),
    summary: input.summary.trim(),
    description: input.description ?? location.description,
    notes: input.notes.trim(),
    hideNameOnPlayerDisplay:
      input.hideNameOnPlayerDisplay ?? location.hideNameOnPlayerDisplay,
    updatedAt: now().toISOString(),
  };
}

function requiredName(value: string): string {
  const name = value.trim();
  if (!name) {
    throw new Error('Location name is required.');
  }

  return name;
}

function normalizeImagePaths(imagePaths: readonly string[]): readonly string[] {
  return [...new Set(imagePaths.map((path) => path.trim()).filter(Boolean))];
}
