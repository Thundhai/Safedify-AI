/**
 * Notification Service — Creates in-app notifications and optionally sends emails.
 *
 * Usage:
 *   import { notify, notifyAllManagers } from '../services/notificationService.js';
 *   await notify({ userId, type, title, message, entityType, entityId });
 *   await notifyAllManagers({ type, title, message, entityType, entityId });
 */
import { v4 as uuid } from 'uuid';
import pool from '../postgres';
import { sendEmail } from './emailService.js';

export type NotificationType = 'info' | 'success' | 'warning' | 'danger';

export interface NotifyParams {
  userId: string;
  type?: NotificationType;
  title: string;
  message: string;
  entityType?: string;   // 'incident' | 'action' | 'permit' | 'inspection' etc.
  entityId?: string;
}

/**
 * Create a notification for a specific user. Also sends email to the user.
 */
export const notify = async (params: NotifyParams): Promise<string> => {
  const id = uuid();
  const { userId, type = 'info', title, message, entityType, entityId } = params;

  // Insert into DB
  await pool.query(
    `INSERT INTO notifications (id, user_id, type, title, message, entity_type, entity_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, userId, type, title, message, entityType || null, entityId || null]
  );

  // Attempt to send email (async, non-blocking)
  try {
    const userResult = await pool.query('SELECT email, name FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    if (user?.email) {
      const emailSent = await sendEmail({
        to: user.email,
        subject: `[Safedify] ${title}`,
        text: `Hi ${user.name || 'there'},\n\n${message}\n\nYou can view details in the Safedify dashboard.`,
      });
      if (emailSent) {
        await pool.query('UPDATE notifications SET email_sent = 1 WHERE id = $1', [id]);
      }
    }
  } catch (err: any) {
    console.error(`[Notify] Email failed for user ${userId}:`, err.message);
  }

  return id;
};

/**
 * Send a notification to all users with manager/admin/supervisor roles.
 * Useful for critical events like new incidents, high-severity updates, etc.
 */
export const notifyAllManagers = async (
  params: Omit<NotifyParams, 'userId'>
): Promise<number> => {
  const managerRoles = ['Admin', 'Manager', 'HSE Manager', 'Supervisor', 'HSE Supervisor', 'HSE Coordinator', 'HSE Advisor'];
  const rolePlaceholders = managerRoles.map((_, i) => `$${i + 1}`).join(',');
  const managersResult = await pool.query(
    `SELECT id FROM users WHERE role IN (${rolePlaceholders})`,
    managerRoles
  );
  const managers = managersResult.rows;

  let count = 0;
  for (const mgr of managers) {
    try {
      await notify({ ...params, userId: mgr.id });
      count++;
    } catch {
      // continue sending to others
    }
  }
  return count;
};

/**
 * Send a notification to a specific user + all managers.
 * Common pattern for status updates where the original reporter
 * AND managers should be informed.
 */
export const notifyUserAndManagers = async (
  params: NotifyParams
): Promise<void> => {
  // Notify the specific user first
  await notify(params);
  // Then notify managers (skip the specific user to avoid duplicate)
  const managerRoles = ['Admin', 'Manager', 'HSE Manager', 'Supervisor', 'HSE Supervisor', 'HSE Coordinator', 'HSE Advisor'];
  const rolePlaceholders = managerRoles.map((_, i) => `$${i + 1}`).join(',');
  const managersResult = await pool.query(
    `SELECT id FROM users WHERE role IN (${rolePlaceholders}) AND id != $${managerRoles.length + 1}`,
    [...managerRoles, params.userId]
  );
  const managers = managersResult.rows;

  for (const mgr of managers) {
    try {
      await notify({ ...params, userId: mgr.id });
    } catch {
      // continue
    }
  }
};
