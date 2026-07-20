import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

loadEnvConfig(path.resolve(__dirname, '../..'));

const nextConfig: NextConfig = {
  transpilePackages: ['@lyamo/shared', '@lyamo/database'],
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
