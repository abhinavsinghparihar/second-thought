import { Controller } from './controller';

/**
 * Entry point. Everything is defensive: if the extension context is dead
 * (e.g. after an update), the page continues to work exactly as before.
 */
try {
  if (chrome?.runtime?.id) {
    const controller = new Controller();
    void controller.start();
  }
} catch {
  // context invalidated or unsupported — stay passive
}
