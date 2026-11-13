import {
  Component,
  computed,
  type ElementRef,
  effect,
  HostListener,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

type Offset = Readonly<{ x: number; y: number }>;

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;

/** Visionneuse plein écran d’une galerie : zoom, déplacement et navigation entre images. */
@Component({
  selector: 'app-media-viewer',
  templateUrl: './media-viewer.html',
})
export class MediaViewer {
  readonly imageUrl = input.required<string>();
  readonly alt = input.required<string>();
  readonly label = input('Image en grand');
  readonly position = input.required<number>();
  readonly count = input.required<number>();
  readonly hasPrevious = input(false);
  readonly hasNext = input(false);

  readonly closed = output();
  readonly previous = output();
  readonly next = output();

  private readonly viewport = viewChild<ElementRef<HTMLDivElement>>('viewport');
  private draggedPointerId: number | null = null;
  private dragStart: Offset = { x: 0, y: 0 };
  private dragStartOffset: Offset = { x: 0, y: 0 };

  protected readonly minZoom = MIN_ZOOM;
  protected readonly maxZoom = MAX_ZOOM;
  protected readonly zoom = signal(MIN_ZOOM);
  protected readonly offset = signal<Offset>({ x: 0, y: 0 });
  protected readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));
  protected readonly transform = computed(() => {
    const { x, y } = this.offset();
    return `translate3d(${x}px, ${y}px, 0) scale(${this.zoom()})`;
  });

  constructor() {
    effect(() => {
      this.imageUrl();
      untracked(() => this.reset());
    });
  }

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void {
    this.closed.emit();
  }

  protected zoomIn(): void {
    this.setZoom(this.zoom() + ZOOM_STEP);
  }

  protected zoomOut(): void {
    this.setZoom(this.zoom() - ZOOM_STEP);
  }

  protected zoomWithWheel(event: WheelEvent): void {
    event.preventDefault();
    const direction = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    this.setZoom(this.zoom() + direction, event.clientX, event.clientY);
  }

  protected startDrag(event: PointerEvent): void {
    if (this.zoom() === MIN_ZOOM || event.button !== 0) return;
    this.draggedPointerId = event.pointerId;
    this.dragStart = { x: event.clientX, y: event.clientY };
    this.dragStartOffset = this.offset();
    (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
  }

  protected drag(event: PointerEvent): void {
    if (event.pointerId !== this.draggedPointerId) return;
    this.offset.set(
      this.clampOffset({
        x: this.dragStartOffset.x + event.clientX - this.dragStart.x,
        y: this.dragStartOffset.y + event.clientY - this.dragStart.y,
      }),
    );
  }

  protected stopDrag(event: PointerEvent): void {
    if (event.pointerId !== this.draggedPointerId) return;
    const target = event.currentTarget as HTMLElement | null;
    if (target?.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId);
    this.draggedPointerId = null;
  }

  protected reset(): void {
    this.zoom.set(MIN_ZOOM);
    this.offset.set({ x: 0, y: 0 });
    this.draggedPointerId = null;
  }

  private setZoom(nextZoom: number, clientX?: number, clientY?: number): void {
    const currentZoom = this.zoom();
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    if (zoom === currentZoom) return;

    const ratio = zoom / currentZoom;
    const current = this.offset();
    const viewport = this.viewport()?.nativeElement;
    let next: Offset = { x: current.x * ratio, y: current.y * ratio };
    if (viewport && clientX !== undefined && clientY !== undefined) {
      const bounds = viewport.getBoundingClientRect();
      const pointerX = clientX - bounds.left - bounds.width / 2;
      const pointerY = clientY - bounds.top - bounds.height / 2;
      next = {
        x: pointerX - (pointerX - current.x) * ratio,
        y: pointerY - (pointerY - current.y) * ratio,
      };
    }

    this.zoom.set(zoom);
    this.offset.set(zoom === MIN_ZOOM ? { x: 0, y: 0 } : this.clampOffset(next));
  }

  private clampOffset(offset: Offset): Offset {
    const viewport = this.viewport()?.nativeElement;
    const image = viewport?.querySelector('img');
    if (!viewport || !image) return offset;

    const zoom = this.zoom();
    const bounds = viewport.getBoundingClientRect();
    const maxX = Math.max(0, (image.clientWidth * zoom - bounds.width) / 2);
    const maxY = Math.max(0, (image.clientHeight * zoom - bounds.height) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, offset.x)),
      y: Math.min(maxY, Math.max(-maxY, offset.y)),
    };
  }
}
