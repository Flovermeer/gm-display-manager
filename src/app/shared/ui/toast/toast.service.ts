/**
 * But
 * Centralise les notifications temporaires destinées au MJ.
 *
 * Responsabilités
 * - publie des toasts accessibles depuis n'importe quelle feature de campagne ;
 * - déclenche leur fermeture automatique après le délai convenu ;
 * - conserve brièvement un toast fermé pour laisser jouer son animation de sortie.
 */

import { Injectable, signal } from '@angular/core';

export type ToastMessage = Readonly<{
  id: string;
  message: string;
  tone: 'success' | 'warning';
  isClosing: boolean;
}>;

const DEFAULT_DURATION = 8_000;
const EXIT_DURATION = 240;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly messagesSignal = signal<readonly ToastMessage[]>([]);
  private readonly dismissTimers = new Map<string, number>();
  private readonly removalTimers = new Map<string, number>();

  readonly messages = this.messagesSignal.asReadonly();

  warning(message: string, duration = DEFAULT_DURATION): string {
    return this.publish(message, 'warning', duration);
  }

  success(message: string, duration = DEFAULT_DURATION): string {
    return this.publish(message, 'success', duration);
  }

  private publish(
    message: string,
    tone: ToastMessage['tone'],
    duration: number,
  ): string {
    const id = crypto.randomUUID();
    this.messagesSignal.update((messages) => [
      ...messages,
      { id, message, tone, isClosing: false },
    ]);
    this.dismissTimers.set(
      id,
      window.setTimeout(() => this.dismiss(id), duration),
    );
    return id;
  }

  dismiss(id: string): void {
    if (!this.messagesSignal().some((message) => message.id === id && !message.isClosing)) return;
    this.clearTimer(this.dismissTimers, id);
    this.messagesSignal.update((messages) =>
      messages.map((message) => (message.id === id ? { ...message, isClosing: true } : message)),
    );
    this.removalTimers.set(
      id,
      window.setTimeout(() => this.remove(id), EXIT_DURATION),
    );
  }

  private remove(id: string): void {
    this.clearTimer(this.dismissTimers, id);
    this.clearTimer(this.removalTimers, id);
    this.messagesSignal.update((messages) => messages.filter((message) => message.id !== id));
  }

  private clearTimer(timers: Map<string, number>, id: string): void {
    const timer = timers.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.delete(id);
  }
}
