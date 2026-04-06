import { registerConfigRoutes } from './config-routes.js';
import { registerKnowledgeRoutes } from './knowledge-routes.js';
import { registerStatsRoutes } from './stats-routes.js';
import { registerTrainingRoutes } from './training-routes.js';
import { registerQuotesRoutes } from './quotes-routes.js';
import { registerNewsRoutes } from './news-routes.js';
function registerSmartBotRoutes(app, { smartBot, requireAuth, saveState, debouncedSaveState, checkNewsFeed }) {
  const ctx = { smartBot, requireAuth, saveState, debouncedSaveState, checkNewsFeed };

  registerConfigRoutes(app, ctx);
  registerKnowledgeRoutes(app, ctx);
  registerStatsRoutes(app, ctx);
  registerTrainingRoutes(app, ctx);
  registerQuotesRoutes(app, ctx);
  registerNewsRoutes(app, ctx);
}

export { registerSmartBotRoutes };