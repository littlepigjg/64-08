export type RegistryType = 'npm' | 'pypi';

export type PackageSource = 'cache' | 'private' | 'upstream';

export type VerificationStatus = 'verified' | 'failed' | 'pending' | 'unverified';

export interface PackageInfo {
  name: string;
  registry: RegistryType;
  source: PackageSource;
  versions: PackageVersion[];
  latestVersion: string;
  description?: string;
  author?: string;
  license?: string;
  scope?: string;
  createdAt: number;
  updatedAt: number;
  totalSize: number;
  downloadCount: number;
  verificationStatus?: VerificationStatus;
}

export interface PackageVersion {
  version: string;
  size: number;
  filePath: string;
  sha1?: string;
  publishedAt: number;
  downloadCount: number;
  integrity?: PackageIntegrity;
}

export interface PackageIntegrity {
  algorithm: 'sha1' | 'sha256' | 'sha512';
  expectedHash: string;
  computedHash: string;
  verified: boolean;
  verifiedAt?: number;
  signature?: string;
}

export interface VerificationConfig {
  enabled: boolean;
  enforce: boolean;
  algorithms: Array<'sha1' | 'sha256' | 'sha512'>;
  verifyOnDownload: boolean;
  verifyOnAccess: boolean;
  allowUnverified: boolean;
}

export interface VerificationResult {
  packageName: string;
  version: string;
  status: VerificationStatus;
  integrity?: PackageIntegrity;
  error?: string;
}

export interface CacheStats {
  totalPackages: number;
  totalVersions: number;
  totalSize: number;
  npmPackages: number;
  pypiPackages: number;
  privatePackages: number;
  cachePackages: number;
  maxSize: number;
  usagePercent: number;
  verifiedPackages: number;
  failedPackages: number;
  unverifiedPackages: number;
}

export interface StorageTrend {
  date: string;
  size: number;
  packages: number;
}

export interface CachePolicy {
  maxSizeGB: number;
  maxAgeDays: number;
  autoClean: boolean;
}
