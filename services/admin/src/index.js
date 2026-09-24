'use strict';

const { startServer } = require('@ibitplay/common');

const config = require('./config');
const { createContainer } = require('./container');
const { buildApp } = require('./app');
const { attachSockets } = require('./sockets');
const { FeaturesService, TEMPLATE_ROW } = require('./modules/features/features.service');

/**
 * A fresh database becomes THIS site.
 *
 * One backend serves every site; what makes a deployment shuffle rather than
 * stake is the feature variants in `site_features` — and the VIP ladder,
 * which follows the `vip` variant. `SITE_TEMPLATE` names the site, and the
 * first boot against an empty table applies it, exactly as the owner panel's
 * "Apply template" would. A table that already has a template row is left
 * alone: after the first boot the site admin owns the choice.
 */
async function bootstrapSite(container) {
  const template = container.config.SITE_TEMPLATE;
  if (!template) return;
  const existing = await container.models.SiteFeature.findByPk(TEMPLATE_ROW, { raw: true, attributes: ['variant'] });
  if (existing) {
    if (existing.variant !== template) container.logger.warn({ template, applied: existing.variant }, 'SITE_TEMPLATE differs from the template this site already runs — leaving the site as it is');
    return;
  }
  const { applied } = await new FeaturesService(container).applyTemplate({ template, enable: true, staff: null });
  container.logger.warn({ template, features: applied.length }, 'SITE_TEMPLATE applied to a fresh site');
}

async function main() {
  const container = await createContainer();
  await bootstrapSite(container);
  const app = buildApp(container);

  const { server } = startServer({
    app,
    port: config.PORT,
    serviceName: config.SERVICE_NAME,
    logger: container.logger,
    onShutdown: [() => container.close()],
  });

  // The operator console is a socket surface; see `sockets.js` for why the
  // moderation events live on user-service's transport instead.
  const sockets = attachSockets({ server, container });
  container.onShutdown = () => sockets.close();
}

main().catch((error) => {
  console.error('admin-service failed to start:', error.message);
  if (error.name !== 'EnvValidationError') console.error(error.stack);
  process.exit(1);
});
