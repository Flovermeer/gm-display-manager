import { AfterViewInit, Component, ElementRef, OnDestroy, viewChild } from '@angular/core';
import * as THREE from 'three';

type VantaEffect = Readonly<{ destroy: () => void }>;
type FogFactory = (options: Record<string, unknown>) => VantaEffect;

@Component({
  selector: 'app-default-display-background',
  template: '<div #background class="default-display-background" aria-hidden="true"></div>',
  styleUrl: './default-display-background.scss',
})
export class DefaultDisplayBackground implements AfterViewInit, OnDestroy {
  private readonly background = viewChild.required<ElementRef<HTMLElement>>('background');
  private effect?: VantaEffect;

  async ngAfterViewInit(): Promise<void> {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try {
      const module = (await import('vanta/dist/vanta.fog.min')) as unknown as {
        default?: FogFactory;
      };
      const fog = module.default ?? (module as unknown as FogFactory);
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
    } catch {
      // Le dégradé CSS reste visible si WebGL ou Vanta n'est pas disponible.
    }
  }

  ngOnDestroy(): void {
    this.effect?.destroy();
  }
}
