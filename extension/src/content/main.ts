import { Controller } from './controller';

/**
 * Content-script entry point.
 *
 * Everything is defensive: if the extension context is dead (e.g. after an
 * update), if the page is a SPA mid-navigation, or if anything else goes
 * wrong, the host page continues to behave exactly as it did before.
 */
try {
  if (chrome?.runtime?.id) {
    const controller = new Controller();
    void controller.start();
  }
} catch {
  // context invalidated or unsupported — stay completely passive
}
