/**
 * Minimal pub/sub used to decouple systems from UI.
 * Gameplay code emits facts ("orb:collected"); HUD/UI decide what to show.
 */
export class EventBus {
  #listeners = new Map();

  on(event, handler) {
    let handlers = this.#listeners.get(event);
    if (!handlers) {
      handlers = new Set();
      this.#listeners.set(event, handlers);
    }
    handlers.add(handler);
    return () => this.off(event, handler);
  }

  once(event, handler) {
    const off = this.on(event, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  off(event, handler) {
    this.#listeners.get(event)?.delete(handler);
  }

  emit(event, payload) {
    const handlers = this.#listeners.get(event);
    if (!handlers) return;
    // Copy first so a handler may unsubscribe during dispatch.
    for (const handler of [...handlers]) handler(payload);
  }

  clear() {
    this.#listeners.clear();
  }
}

export default EventBus;
