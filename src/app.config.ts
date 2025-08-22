import * as dotenv from 'dotenv';

dotenv.config();

export const env = <T = any>(key: string, defaultVal: any = undefined): T => {
  return process.env[key] ?? defaultVal;
};

env.require = <T = any>(key: string, defaultVal: any = undefined): T => {
  const value = process.env[key] ?? defaultVal;
  if (!value) {
    throw new Error(`Environment variable '${key}' is missing!`);
  }
  return value;
};

const config = {
  environment: env.require('NODE_ENV', 'development'),

  app: {
    name: 'Odoo API',
    port: parseInt(env('PORT', 3000)),
    hostname: env('APP_HOSTNAME', '0.0.0.0'),
    host: env('APP_HOST', `http://localhost:${parseInt(env('PORT', 3000))}`),
    api: {
      version: env('APP_API_VERSION', 'api/v1'),
    },
  },

  odoo: {
    url: env('ODOO_URL', 'http://localhost:8069'),
    database: env('ODOO_DATABASE', 'odoo'),
    username: env('ODOO_USERNAME', 'admin'),
    password: env('ODOO_PASSWORD', 'admin'),
  },
};

export default () => config;
