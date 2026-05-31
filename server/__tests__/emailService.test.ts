import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
};

const importEmailService = async () => {
  vi.resetModules();
  return import('../services/emailService.js');
};

describe('emailService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
  });

  afterEach(() => {
    if (originalEnv.RESEND_API_KEY === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalEnv.RESEND_API_KEY;
    }

    if (originalEnv.EMAIL_FROM === undefined) {
      delete process.env.EMAIL_FROM;
    } else {
      process.env.EMAIL_FROM = originalEnv.EMAIL_FROM;
    }
  });

  it('returns false when email delivery is not configured', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { sendEmail, isEmailConfigured } = await importEmailService();

    expect(isEmailConfigured).toBe(false);
    await expect(
      sendEmail({
        to: 'worker@example.com',
        subject: 'Permit approved',
        text: 'Your permit is approved.',
      })
    ).resolves.toBe(false);

    expect(logSpy).toHaveBeenCalledWith('[Email Preview] To: worker@example.com | Subject: Permit approved');
    expect(warnSpy).toHaveBeenCalledWith('[Email] Delivery skipped because RESEND_API_KEY is not configured');
  });

  it('returns true when Resend accepts the request', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.EMAIL_FROM = 'Safedify <noreply@example.com>';

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { sendEmail, isEmailConfigured } = await importEmailService();

    expect(isEmailConfigured).toBe(true);
    await expect(
      sendEmail({
        to: 'manager@example.com',
        subject: 'Action assigned',
        text: 'An action has been assigned to you.',
      })
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({ method: 'POST' })
    );
    expect(logSpy).toHaveBeenCalledWith('[Email] Sent to manager@example.com: Action assigned');
  });
});