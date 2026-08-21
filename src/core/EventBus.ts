/**
 * Minimal typed pub/sub used to decouple systems from UI.
 * Gameplay code emits facts ("orb:collected"); the UI decides what to show.
 */
export type EventHandler<T> = (payload: T) => void;

// The map is intentionally unconstrained: an `interface` has no index
// signature, so `Record<string, unknown>` would reject the very event maps
// this bus exists to type.
export class EventBus<TEvents> {
  readonly #listeners = new Map<keyof TEvents, Set<EventHandler<never>>>();

  on<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): () => void {
    let handlers = this.#listeners.get(event);
    if (!handlers) {
      handlers = new Set();
      this.#listeners.set(event, handlers);
    }
    handlers.add(handler as EventHandler<never>);
    return () => this.off(event, handler);
  }

  once<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): () => void {
    const off = this.on(event, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  off<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): void {
    this.#listeners.get(event)?.delete(handler as EventHandler<never>);
  }

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    const handlers = this.#listeners.get(event);
    if (!handlers) return;
    // Copy first so a handler may unsubscribe during dispatch.
    for (const handler of [...handlers]) (handler as EventHandler<TEvents[K]>)(payload);
  }

  clear(): void {
    this.#listeners.clear();
  }
}

export default EventBus;
