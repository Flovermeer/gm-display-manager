import { Injectable } from '@angular/core';

import {
  MediaDiagnosticGateway,
  type MediaFileStatus,
} from '@app/features/diagnostics/data-access/media-diagnostic.gateway';
import type { MediaReference } from '@app/features/diagnostics/domain/diagnostic.models';

@Injectable()
export class BrowserMediaDiagnosticGateway extends MediaDiagnosticGateway {
  override readonly isAvailable = false;
  override readonly isPrimaryWindow = true;

  override async listReferences(): Promise<readonly MediaReference[]> {
    return [];
  }

  override async inspectFile(_reference: MediaReference): Promise<MediaFileStatus> {
    return 'healthy';
  }

  override async replaceFile(_reference: MediaReference): Promise<boolean> {
    return false;
  }
}
