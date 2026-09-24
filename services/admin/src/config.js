'use strict';

const path = require('path');
const {
  loadEnv,
  coercers,
  httpEnvShape,
  dbEnvShape,
  jwtEnvShape,
  adminJwtEnvShape,
  secretEncryptionEnvShape,
  internalKeysEnvShape,
  serviceDiscoveryEnvShape,
} = require('@ibitplay/common');

/** admin-service configuration. Validated once at boot; a bad value stops the process here. */
const config = loadEnv(
  {
    ...httpEnvShape,
    ...dbEnvShape,
    ...jwtEnvShape,
    ...adminJwtEnvShape,
    // TOTP secrets are encrypted at rest — see `secretEncryptionEnvShape`.
    ...secretEncryptionEnvShape,
    // Identify this service to the others — see `internalAcl.js`.
    ...internalKeysEnvShape,
    ...serviceDiscoveryEnvShape,
    ADMIN_SERVICE_PORT: coercers.int(4002),
    /**
     * Which site this deployment IS — `shuffle`, `bcgame`, `stake` or
     * `addaplay`, a template name from featureCatalogue.js. On boot, a database
     * that has never had a template applied gets this one: every feature on
     * that site's variant, and with it the VIP ladder. Set once per server;
     * after that the site admin's Features screen is the truth and this is
     * ignored.
     */
    SITE_TEMPLATE: coercers.optionalStr(),
    // The ceiling on a single direct wallet refill. Legacy had none — one
    // request could credit any amount an operator typed.
    ADMIN_MAX_REFILL: coercers.str('1000000'),

  },
  { serviceDir: path.resolve(__dirname, '..') }
);

config.SERVICE_NAME = 'admin-service';
config.PORT = config.ADMIN_SERVICE_PORT;

module.exports = config;
