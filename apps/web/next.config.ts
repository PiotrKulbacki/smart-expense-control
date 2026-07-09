import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@smart-expense-control/shared', '@smart-expense-control/database'],
};

export default nextConfig;
