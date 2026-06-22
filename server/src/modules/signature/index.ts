import crypto from 'crypto';
import fs from 'fs';
import { config } from '../../config';
import { getMetadataIndex } from '../metadata';
import type {
  PackageIntegrity,
  VerificationConfig,
  VerificationResult,
  VerificationStatus,
} from '../../types';

const DEFAULT_VERIFICATION_CONFIG: VerificationConfig = {
  enabled: true,
  enforce: false,
  algorithms: ['sha1', 'sha256'],
  verifyOnDownload: true,
  verifyOnAccess: false,
  allowUnverified: true,
};

export class SignatureVerifier {
  private config: VerificationConfig;

  constructor() {
    this.config = { ...DEFAULT_VERIFICATION_CONFIG };
  }

  getConfig(): VerificationConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<VerificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  async computeHash(
    filePath: string,
    algorithm: 'sha1' | 'sha256' | 'sha512' = 'sha1'
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash(algorithm);
      const stream = fs.createReadStream(filePath);

      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  computeHashSync(
    data: Buffer,
    algorithm: 'sha1' | 'sha256' | 'sha512' = 'sha1'
  ): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  async verifyPackage(
    packageName: string,
    version: string,
    filePath: string,
    expectedHash: string,
    algorithm: 'sha1' | 'sha256' | 'sha512' = 'sha1'
  ): Promise<VerificationResult> {
    if (!this.config.enabled) {
      return {
        packageName,
        version,
        status: 'unverified',
      };
    }

    try {
      const computedHash = await this.computeHash(filePath, algorithm);
      const verified = computedHash.toLowerCase() === expectedHash.toLowerCase();

      const integrity: PackageIntegrity = {
        algorithm,
        expectedHash: expectedHash.toLowerCase(),
        computedHash,
        verified,
        verifiedAt: Date.now(),
      };

      const metadata = getMetadataIndex();
      metadata.updateVersionIntegrity(packageName, 'npm', version, integrity);

      return {
        packageName,
        version,
        status: verified ? 'verified' : 'failed',
        integrity,
      };
    } catch (error) {
      return {
        packageName,
        version,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  verifyPackageSync(
    packageName: string,
    version: string,
    data: Buffer,
    expectedHash: string,
    algorithm: 'sha1' | 'sha256' | 'sha512' = 'sha1'
  ): VerificationResult {
    if (!this.config.enabled) {
      return {
        packageName,
        version,
        status: 'unverified',
      };
    }

    try {
      const computedHash = this.computeHashSync(data, algorithm);
      const verified = computedHash.toLowerCase() === expectedHash.toLowerCase();

      const integrity: PackageIntegrity = {
        algorithm,
        expectedHash: expectedHash.toLowerCase(),
        computedHash,
        verified,
        verifiedAt: Date.now(),
      };

      const metadata = getMetadataIndex();
      metadata.updateVersionIntegrity(packageName, 'npm', version, integrity);

      return {
        packageName,
        version,
        status: verified ? 'verified' : 'failed',
        integrity,
      };
    } catch (error) {
      return {
        packageName,
        version,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async verifyOrReject(
    packageName: string,
    version: string,
    filePath: string,
    expectedHash: string,
    algorithm: 'sha1' | 'sha256' | 'sha512' = 'sha1'
  ): Promise<{ allowed: boolean; result: VerificationResult }> {
    const result = await this.verifyPackage(
      packageName,
      version,
      filePath,
      expectedHash,
      algorithm
    );

    if (!this.config.enabled) {
      return { allowed: true, result };
    }

    if (this.config.enforce && result.status === 'failed') {
      return { allowed: false, result };
    }

    if (
      !this.config.allowUnverified &&
      result.status === 'unverified'
    ) {
      return { allowed: false, result };
    }

    return { allowed: true, result };
  }

  getPackageVerificationStatus(
    packageName: string,
    registry: 'npm' | 'pypi'
  ): VerificationStatus {
    const metadata = getMetadataIndex();
    const pkg = metadata.getPackage(packageName, registry);

    if (!pkg) return 'unverified';

    const versions = pkg.versions || [];
    if (versions.length === 0) return 'unverified';

    const hasFailed = versions.some(
      (v) => v.integrity && v.integrity.verified === false
    );
    if (hasFailed) return 'failed';

    const allVerified = versions.every(
      (v) => v.integrity && v.integrity.verified === true
    );
    if (allVerified) return 'verified';

    const hasPending = versions.some((v) => !v.integrity);
    if (hasPending) return 'pending';

    return 'unverified';
  }

  async verifyAllCachedPackages(): Promise<{
    total: number;
    verified: number;
    failed: number;
    errors: string[];
  }> {
    const metadata = getMetadataIndex();
    const { packages } = metadata.listPackages({ limit: 10000 });

    const result = {
      total: 0,
      verified: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const pkg of packages) {
      for (const ver of pkg.versions) {
        if (!ver.sha1 || !ver.filePath) continue;
        if (!fs.existsSync(ver.filePath)) continue;

        result.total++;
        const verification = await this.verifyPackage(
          pkg.name,
          ver.version,
          ver.filePath,
          ver.sha1,
          'sha1'
        );

        if (verification.status === 'verified') {
          result.verified++;
        } else if (verification.status === 'failed') {
          result.failed++;
          if (verification.error) {
            result.errors.push(`${pkg.name}@${ver.version}: ${verification.error}`);
          }
        }
      }
    }

    return result;
  }

  parseIntegrity(integrity: string): {
    algorithm: 'sha1' | 'sha256' | 'sha512';
    hash: string;
  } | null {
    const match = integrity.match(/^(sha1|sha256|sha512)-(.+)$/);
    if (!match) return null;

    return {
      algorithm: match[1] as 'sha1' | 'sha256' | 'sha512',
      hash: Buffer.from(match[2], 'base64').toString('hex'),
    };
  }
}

let verifierInstance: SignatureVerifier | null = null;

export function getSignatureVerifier(): SignatureVerifier {
  if (!verifierInstance) {
    verifierInstance = new SignatureVerifier();
  }
  return verifierInstance;
}
