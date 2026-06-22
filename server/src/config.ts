import path from 'path';
import type { VerificationConfig } from './types';

const parseAlgorithms = (envValue: string | undefined): Array<'sha1' | 'sha256' | 'sha512'> => {
  if (!envValue) return ['sha1', 'sha256'];
  const valid = ['sha1', 'sha256', 'sha512'] as const;
  return envValue
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is (typeof valid)[number] => valid.includes(s as any));
};

export const config = {
  port: parseInt(process.env.PORT || '4873', 10),
  storageDir: process.env.STORAGE_DIR || path.resolve(process.cwd(), '..', 'storage'),
  dataDir: process.env.DATA_DIR || path.resolve(process.cwd(), '..', 'data'),
  npm: {
    upstream: process.env.NPM_UPSTREAM || 'https://registry.npmjs.org',
    privateScopes: (process.env.NPM_PRIVATE_SCOPES || '@local,@private').split(','),
  },
  pypi: {
    upstream: process.env.PYPI_UPSTREAM || 'https://pypi.org',
    simpleUpstream: process.env.PYPI_SIMPLE_UPSTREAM || 'https://pypi.org/simple',
  },
  cache: {
    maxSizeGB: parseFloat(process.env.CACHE_MAX_SIZE_GB || '50'),
    maxAgeDays: parseInt(process.env.CACHE_MAX_AGE_DAYS || '90', 10),
    autoClean: process.env.CACHE_AUTO_CLEAN !== 'false',
  },
  auth: {
    requireAuth: process.env.REQUIRE_AUTH === 'true',
    adminToken: process.env.ADMIN_TOKEN || 'admin-token-change-me',
  },
  signature: {
    enabled: process.env.SIGNATURE_ENABLED !== 'false',
    enforce: process.env.SIGNATURE_ENFORCE === 'true',
    algorithms: parseAlgorithms(process.env.SIGNATURE_ALGORITHMS),
    verifyOnDownload: process.env.SIGNATURE_VERIFY_ON_DOWNLOAD !== 'false',
    verifyOnAccess: process.env.SIGNATURE_VERIFY_ON_ACCESS === 'true',
    allowUnverified: process.env.SIGNATURE_ALLOW_UNVERIFIED !== 'false',
  } as VerificationConfig,
};

export type AppConfig = typeof config;
