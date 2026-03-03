import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldOff, Copy, Check, Loader2, Key } from 'lucide-react';
import { api2FASetup, api2FAVerify, api2FAStatus, api2FADisable } from '../services/apiService';

export default function TwoFactorSetup() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<{ secret: string; uri: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api2FAStatus().then(d => { setEnabled(d.enabled); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleSetup = async () => {
    setError('');
    setSuccess('');
    try {
      const data = await api2FASetup();
      setSetupData(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6 && verifyCode.length !== 8) {
      setError('Enter the 6-digit code from your authenticator app');
      return;
    }
    setError('');
    try {
      const data = await api2FAVerify(verifyCode);
      setEnabled(true);
      setSetupData(null);
      setBackupCodes(data.backupCodes || []);
      setSuccess('2FA enabled successfully! Save your backup codes.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDisable = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This reduces account security.')) return;
    try {
      await api2FADisable();
      setEnabled(false);
      setSetupData(null);
      setBackupCodes([]);
      setSuccess('2FA has been disabled');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copySecret = () => {
    if (setupData) {
      navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 p-4">
        <Loader2 size={16} className="animate-spin" /> Loading 2FA status...
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${enabled ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
          {enabled ? <ShieldCheck size={24} /> : <Shield size={24} />}
        </div>
        <div>
          <h3 className="font-bold text-slate-800 dark:text-white">Two-Factor Authentication</h3>
          <p className="text-sm text-slate-500">
            {enabled ? 'Your account is protected with 2FA' : 'Add an extra layer of security to your account'}
          </p>
        </div>
        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
          {enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{success}</div>}

      {/* Backup codes panel */}
      {backupCodes.length > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Key size={16} className="text-yellow-600" />
            <h4 className="font-bold text-yellow-800 text-sm">Backup Codes — Save These Now!</h4>
          </div>
          <p className="text-xs text-yellow-700 mb-3">Each code can only be used once. Store them securely.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {backupCodes.map((code, i) => (
              <code key={i} className="bg-white px-3 py-2 rounded text-center text-sm font-mono border border-yellow-200">
                {code}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Setup flow */}
      {!enabled && !setupData && (
        <button
          onClick={handleSetup}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm"
        >
          Set Up 2FA
        </button>
      )}

      {setupData && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              1. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
            </p>
            <div className="flex justify-center p-4 bg-white rounded-lg mb-3">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.uri)}`}
                alt="2FA QR Code"
                className="w-48 h-48"
              />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Or enter this key manually:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-white dark:bg-slate-600 rounded text-sm font-mono break-all border">
                {setupData.secret}
              </code>
              <button onClick={copySecret} className="p-2 bg-slate-200 rounded hover:bg-slate-300 transition">
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              2. Enter the 6-digit code from your app:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="flex-1 px-4 py-2.5 border rounded-lg text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                maxLength={6}
              />
              <button
                onClick={handleVerify}
                disabled={verifyCode.length !== 6}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Verify
              </button>
            </div>
          </div>

          <button
            onClick={() => { setSetupData(null); setVerifyCode(''); setError(''); }}
            className="text-sm text-slate-500 hover:text-slate-700 transition"
          >
            Cancel setup
          </button>
        </div>
      )}

      {enabled && (
        <button
          onClick={handleDisable}
          className="w-full py-2.5 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition text-sm flex items-center justify-center gap-2"
        >
          <ShieldOff size={16} /> Disable 2FA
        </button>
      )}
    </div>
  );
}
