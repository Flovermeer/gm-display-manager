import { AfterViewInit, Component, ElementRef, OnDestroy, inject, viewChild } from '@angular/core';
import * as THREE from 'three';

import { TechnicalLogService } from '@app/features/diagnostics/application/technical-log.service';

type VantaEffect = Readonly<{ destroy: () => void }>;
type FogFactory = (options: Record<string, unknown>) => VantaEffect;

@Component({
  selector: 'app-default-display-background',
  template: '<div #background class="default-display-background" aria-hidden="true"></div>',
  styleUrl: './default-display-background.scss',
})
export class DefaultDisplayBackground implements AfterViewInit, OnDestroy {
  private readonly log = inject(TechnicalLogService);
  private readonly background = viewChild.required<ElementRef<HTMLElement>>('background');
  private effect?: VantaEffect;

  async ngAfterViewInit(): Promise<void> {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.log.reportInfo('display.fog', 'Animations réduites par le système : brume statique.');
      return;
    }
    try {
      const fog = resolveFogFactory(await import('vanta/dist/vanta.fog.min'));
      this.effect = fog({
        el: this.background().nativeElement,
        THREE,
        mouseControls: false,
        touchControls: false,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        highlightColor: 0x00b6ff,
        midtoneColor: 0x581e6a,
        lowlightColor: 0x271f47,
        baseColor: 0x06060b,
        speed: 1.5,
      });
    } catch (error) {
      // Le dégradé CSS reste visible si WebGL ou Vanta n'est pas disponible.
      this.log.reportError('display.fog', error);
    }
  }

  ngOnDestroy(): void {
    this.effect?.destroy();
  }
}

/**
 * Vanta est un module CommonJS dont `module.exports` vaut déjà `{ default: FOG }`. Selon le build,
 * l'import dynamique ajoute ou non une enveloppe `default` : en production on obtient
 * `{ default: { default: FOG } }`. On descend donc les `default` jusqu'à trouver la fonction.
 */
export function resolveFogFactory(module: unknown): FogFactory {
  let candidate = module;
  for (let depth = 0; depth < 3 && typeof candidate !== 'function'; depth++) {
    candidate =
      typeof candidate === 'object' && candidate !== null && 'default' in candidate
        ? candidate.default
        : undefined;
  }
  if (typeof candidate !== 'function') {
    throw new TypeError('Le module Vanta Fog ne fournit pas de fonction de création.');
  }
  return candidate as FogFactory;
}
