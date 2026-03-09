import { registerPageRoutes } from './routes/page-routes.js';
import { registerPetsRoutes } from './routes/pets-routes.js';
import { registerTwitchRoutes } from './routes/twitch-routes.js';
import { registerConfigRoutes } from './routes/config-routes.js';
import { registerLevelingRoutes } from './routes/leveling-routes.js';
import { registerEventsRoutes } from './routes/events-routes.js';

/**
 * Express Routes — orchestrator
 * Delegates to domain-specific route modules in ./routes/
 */
export function registerExpressRoutes(app, deps) {
  registerPageRoutes(app, deps);
  const { notifyPetsChange } = registerPetsRoutes(app, deps);
  registerTwitchRoutes(app, deps);
  registerConfigRoutes(app, deps);
  registerLevelingRoutes(app, deps);
  registerEventsRoutes(app, deps);

  return { notifyPetsChange };
}
