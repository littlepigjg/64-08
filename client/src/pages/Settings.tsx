import { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  HardDrive,
  Clock,
  Trash2,
  Loader2,
  ShieldAlert,
  Play,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { api } from '../api';
import type { CachePolicy, HealthInfo, VerificationConfig } from '../types';
import { formatSize } from '../utils';

export default function Settings() {
  const [policy, setPolicy] = useState<CachePolicy | null>(null);
  const [sigConfig, setSigConfig] = useState<VerificationConfig | null>(null);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSig, setSavingSig] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [verifyingAll, setVerifyingAll] = useState(false);
  const [cleanResult, setCleanResult] = useState<{ deletedFiles: number; freedBytes: number } | null>(null);
  const [verifyResult, setVerifyResult] = useState<{
    total: number;
    verified: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveSigMsg, setSaveSigMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, sc, h] = await Promise.all([
        api.getCachePolicy(),
        api.getSignatureConfig(),
        api.health(),
      ]);
      setPolicy(p);
      setSigConfig(sc);
      setHealth(h);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    if (!policy) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await api.updateCachePolicy(policy);
      setSaveMsg('success');
      setTimeout(() => setSaveMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleCleanup = async () => {
    if (!confirm('根据当前缓存策略执行清理？过期文件和超出存储上限的缓存将被删除。')) return;
    setCleaning(true);
    setCleanResult(null);
    try {
      const r = await api.runCleanup();
      setCleanResult({ deletedFiles: r.deletedFiles, freedBytes: r.freedBytes });
    } finally {
      setCleaning(false);
    }
  };

  const handleSaveSigConfig = async () => {
    if (!sigConfig) return;
    setSavingSig(true);
    setSaveSigMsg(null);
    try {
      await api.updateSignatureConfig(sigConfig);
      setSaveSigMsg('success');
      setTimeout(() => setSaveSigMsg(null), 3000);
    } finally {
      setSavingSig(false);
    }
  };

  const handleVerifyAll = async () => {
    if (!confirm('对所有已缓存的包执行签名验证？这可能需要一些时间。')) return;
    setVerifyingAll(true);
    setVerifyResult(null);
    try {
      const r = await api.verifyAllPackages();
      setVerifyResult({
        total: r.total,
        verified: r.verified,
        failed: r.failed,
        errors: r.errors,
      });
    } finally {
      setVerifyingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">系统设置</h1>
        <p className="text-sm text-slate-500 mt-1">配置缓存策略、签名验证和安全选项</p>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
          <SettingsIcon size={20} /> 存储策略
        </h2>

        {policy && (
          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <HardDrive size={16} className="text-slate-400" /> 存储上限 (GB)
              </label>
              <input
                type="number"
                className="input max-w-xs"
                min={0.1}
                step={0.5}
                value={policy.maxSizeGB}
                onChange={(e) =>
                  setPolicy({ ...policy, maxSizeGB: parseFloat(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-slate-500 mt-1.5">
                缓存占用超过此阈值时，将自动清理最少使用的缓存包
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Clock size={16} className="text-slate-400" /> 缓存过期天数
              </label>
              <input
                type="number"
                className="input max-w-xs"
                min={0}
                step={1}
                value={policy.maxAgeDays}
                onChange={(e) =>
                  setPolicy({ ...policy, maxAgeDays: parseInt(e.target.value, 10) || 0 })
                }
              />
              <p className="text-xs text-slate-500 mt-1.5">
                超过此天数未被访问的缓存包将被自动清理；设为 0 表示永不过期
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <ShieldAlert size={16} className="text-slate-400" /> 自动清理
              </label>
              <label className="inline-flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600"
                  checked={policy.autoClean}
                  onChange={(e) => setPolicy({ ...policy, autoClean: e.target.checked })}
                />
                <span className="text-sm text-slate-600">
                  启动时自动根据策略清理缓存
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? '保存中...' : '保存策略'}
              </button>
              {saveMsg === 'success' && (
                <span className="text-sm text-emerald-600 inline-flex items-center gap-1">
                  <CheckCircle2 size={16} /> 已保存
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
          <ShieldAlert size={20} /> 签名验证
        </h2>

        {sigConfig && (
          <div className="space-y-6">
            <div>
              <label className="inline-flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600"
                  checked={sigConfig.enabled}
                  onChange={(e) =>
                    setSigConfig({ ...sigConfig, enabled: e.target.checked })}
                />
                <span className="text-sm font-medium text-slate-700">
                  启用签名验证
                </span>
              </label>
              <p className="text-xs text-slate-500 mt-1.5">
                下载包时自动验证包的完整性，防止供应链攻击
              </p>
            </div>

            <div>
              <label className="inline-flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600"
                  checked={sigConfig.enforce}
                  onChange={(e) =>
                    setSigConfig({ ...sigConfig, enforce: e.target.checked })}
                  disabled={!sigConfig.enabled}
                />
                <span className={`text-sm font-medium ${sigConfig.enabled ? 'text-slate-700' : 'text-slate-400'}`}>
                  强制验证模式
                </span>
              </label>
              <p className="text-xs text-slate-500 mt-1.5">
                拒绝任何签名验证失败的包安装，开启后将严格校验所有下载
              </p>
            </div>

            <div>
              <label className="inline-flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600"
                  checked={sigConfig.verifyOnDownload}
                  onChange={(e) =>
                    setSigConfig({ ...sigConfig, verifyOnDownload: e.target.checked })}
                  disabled={!sigConfig.enabled}
                />
                <span className={`text-sm font-medium ${sigConfig.enabled ? 'text-slate-700' : 'text-slate-400'}`}>
                  下载时验证
                </span>
              </label>
              <p className="text-xs text-slate-500 mt-1.5">
                从上游下载包时立即进行哈希验证（推荐）
              </p>
            </div>

            <div>
              <label className="inline-flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600"
                  checked={sigConfig.verifyOnAccess}
                  onChange={(e) =>
                    setSigConfig({ ...sigConfig, verifyOnAccess: e.target.checked })}
                  disabled={!sigConfig.enabled}
                />
                <span className={`text-sm font-medium ${sigConfig.enabled ? 'text-slate-700' : 'text-slate-400'}`}>
                  访问时验证
                </span>
              </label>
              <p className="text-xs text-slate-500 mt-1.5">
                从缓存读取包时在后台异步验证（可能影响性能）
              </p>
            </div>

            <div>
              <label className="inline-flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600"
                  checked={sigConfig.allowUnverified}
                  onChange={(e) =>
                    setSigConfig({ ...sigConfig, allowUnverified: e.target.checked })}
                  disabled={!sigConfig.enabled}
                />
                <span className={`text-sm font-medium ${sigConfig.enabled ? 'text-slate-700' : 'text-slate-400'}`}>
                  允许未验证的包
                </span>
              </label>
              <p className="text-xs text-slate-500 mt-1.5">
                允许无法获取签名信息的包继续安装
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Database size={16} className="text-slate-400" /> 哈希算法
              </label>
              <div className="flex flex-wrap gap-2">
                {(['sha1', 'sha256', 'sha512'] as const).map((algo) => (
                  <label
                    key={algo}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      sigConfig.algorithms.includes(algo)
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-500'
                    } ${!sigConfig.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                      checked={sigConfig.algorithms.includes(algo)}
                      onChange={(e) => {
                        if (!sigConfig.enabled) return;
                        if (e.target.checked) {
                          setSigConfig({
                            ...sigConfig,
                            algorithms: [...sigConfig.algorithms, algo],
                          });
                        } else {
                          setSigConfig({
                            ...sigConfig,
                            algorithms: sigConfig.algorithms.filter((a) => a !== algo),
                          });
                        }
                      }}
                      disabled={!sigConfig.enabled}
                    />
                    <span className="text-sm font-mono uppercase">{algo}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                选择用于验证的哈希算法，NPM 官方使用 SHA1
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                className="btn btn-primary"
                onClick={handleSaveSigConfig}
                disabled={savingSig || !sigConfig.enabled}
              >
                {savingSig && <Loader2 size={16} className="animate-spin" />}
                {savingSig ? '保存中...' : '保存配置'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleVerifyAll}
                disabled={verifyingAll || !sigConfig.enabled}
              >
                {verifyingAll && <Loader2 size={16} className="animate-spin" />}
                {verifyingAll ? '验证中...' : '验证所有包'}
              </button>
              {saveSigMsg === 'success' && (
                <span className="text-sm text-emerald-600 inline-flex items-center gap-1">
                  <CheckCircle2 size={16} /> 已保存
                </span>
              )}
            </div>

            {verifyResult && (
              <div className={`mt-5 p-4 rounded-lg border ${
                verifyResult.failed > 0
                  ? 'bg-red-50 border-red-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className={`flex items-center gap-2 ${
                  verifyResult.failed > 0 ? 'text-red-800' : 'text-emerald-800'
                }`}>
                  <CheckCircle2 size={20} />
                  <span className="font-medium">批量验证完成</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className={`${
                      verifyResult.failed > 0 ? 'text-red-700' : 'text-emerald-700'
                    }`}>总计：</span>
                    <span className="font-semibold">{verifyResult.total} 个</span>
                  </div>
                  <div>
                    <span className="text-emerald-700">通过：</span>
                    <span className="font-semibold">{verifyResult.verified} 个</span>
                  </div>
                  <div>
                    <span className="text-red-700">失败：</span>
                    <span className="font-semibold">{verifyResult.failed} 个</span>
                  </div>
                </div>
                {verifyResult.errors.length > 0 && (
                  <div className="mt-3 text-xs text-red-600">
                    <p className="font-medium mb-1">错误详情：</p>
                    <ul className="list-disc ml-4 space-y-0.5">
                      {verifyResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {verifyResult.errors.length > 5 && (
                        <li>... 还有 {verifyResult.errors.length - 5} 个错误</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
          <Trash2 size={20} /> 手动清理
        </h2>

        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 mb-5">
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">清理会根据当前策略删除：</p>
              <ul className="list-disc ml-4 mt-1 space-y-0.5">
                <li>超过过期天数未使用的缓存包</li>
                <li>超出存储上限部分中最久未被使用的缓存</li>
                <li><strong>私有包不会被清理</strong>，仅清理代理缓存</li>
              </ul>
            </div>
          </div>
        </div>

        <button className="btn btn-danger" onClick={handleCleanup} disabled={cleaning}>
          {cleaning ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Play size={16} />
          )}
          {cleaning ? '清理中...' : '立即执行清理'}
        </button>

        {cleanResult && (
          <div className="mt-5 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 size={20} />
              <span className="font-medium">清理完成</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-emerald-700">删除文件：</span>
                <span className="font-semibold">{cleanResult.deletedFiles} 个</span>
              </div>
              <div>
                <span className="text-emerald-700">释放空间：</span>
                <span className="font-semibold">{formatSize(cleanResult.freedBytes)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {health && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
            <Database size={20} /> 服务配置
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ConfigRow label="服务版本" value={health.version} mono />
            <ConfigRow label="服务端口" value={`${health.config.port}`} mono />
            <ConfigRow label="存储目录" value={health.config.storageDir} mono full />
            <ConfigRow label="NPM 上游" value={health.config.npmUpstream} mono full link />
            <ConfigRow label="PyPI 上游" value={health.config.pypiUpstream} mono full link />
            <ConfigRow
              label="私有 Scope"
              value={health.config.privateScopes.join(', ')}
              mono
              full
            />
          </div>

          <div className="mt-6 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <h3 className="font-medium text-slate-700 mb-3">📖 使用说明</h3>
            <div className="space-y-3 text-sm text-slate-600">
              <div>
                <p className="font-medium text-slate-700 mb-1">NPM 配置：</p>
                <code className="block bg-white border border-slate-200 px-3 py-2 rounded font-mono text-xs">
                  npm config set registry http://localhost:{health.config.port}/npm
                </code>
                <p className="text-xs text-slate-500 mt-1">
                  或单次使用：<code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">npm install --registry http://localhost:{health.config.port}/npm package-name</code>
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-700 mb-1">PyPI 配置：</p>
                <code className="block bg-white border border-slate-200 px-3 py-2 rounded font-mono text-xs">
                  pip install -i http://localhost:{health.config.port}/pypi/simple/ package-name
                </code>
                <p className="text-xs text-slate-500 mt-1">
                  或永久配置：<code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">pip config set global.index-url http://localhost:{health.config.port}/pypi/simple/</code>
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-700 mb-1">发布私有包（NPM）：</p>
                <code className="block bg-white border border-slate-200 px-3 py-2 rounded font-mono text-xs">
                  npm publish --registry http://localhost:{health.config.port}/npm
                </code>
                <p className="text-xs text-slate-500 mt-1">
                  私有包必须使用已配置的 scope：{health.config.privateScopes.map(s => `<span class="font-mono">${s}/*</span>`).join('、')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigRow({
  label,
  value,
  mono,
  full,
  link,
}: {
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
  link?: boolean;
}) {
  return (
    <div className={`${full ? 'md:col-span-2' : ''}`}>
      <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</div>
      {link ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className={`text-slate-700 text-sm hover:text-indigo-600 break-all ${
            mono ? 'font-mono' : ''
          }`}
        >
          {value} ↗
        </a>
      ) : (
        <div className={`text-slate-700 text-sm break-all ${mono ? 'font-mono bg-slate-50 px-2 py-1 rounded' : ''}`}>
          {value}
        </div>
      )}
    </div>
  );
}
