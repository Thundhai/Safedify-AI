import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Info,
  AlertOctagon,
  X,
} from 'lucide-react';
import { AppNotification, NotificationType } from '../types';
import {
  apiGetNotifications,
  apiGetUnreadCount,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
  apiDeleteNotification,
} from '../services/apiService';

// ── Helpers ──────────────────────────────────────────────────

const typeConfig: Record<NotificationType, { icon: typeof Bell; color: string; bg: string }> = {
  info:    { icon: Info,           color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-100 dark:bg-blue-900/40' },
  success: { icon: CheckCircle2,   color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/40' },
  warning: { icon: AlertTriangle,  color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/40' },
  danger:  { icon: AlertOctagon,   color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-100 dark:bg-red-900/40' },
};

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

const entityPath = (entityType?: string, entityId?: string): string | null => {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case 'incident': return `/incidents/${entityId}`;
    case 'action':   return `/actions`;
    case 'permit':   return `/permits`;
    default:         return null;
  }
};

// ── Component ────────────────────────────────────────────────

export const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // ── Fetch unread count (polled) ─────────────────────────────

  const fetchUnread = useCallback(async () => {
    if (document.hidden) return; // skip when tab is not visible
    try {
      const data = await apiGetUnreadCount();
      setUnread(data.count || 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // ── Fetch full list when panel opens ────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGetNotifications(30);
      setNotifications(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) fetchAll();
  }, [open, fetchAll]);

  // ── Close on outside click ──────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── Actions ─────────────────────────────────────────────────

  const markRead = async (id: string) => {
    await apiMarkNotificationRead(id);
    setNotifications(p => p.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    setUnread(u => Math.max(0, u - 1));
  };

  const markAllRead = async () => {
    await apiMarkAllNotificationsRead();
    setNotifications(p => p.map(n => ({ ...n, is_read: 1 })));
    setUnread(0);
  };

  const remove = async (id: string, wasUnread: boolean) => {
    await apiDeleteNotification(id);
    setNotifications(p => p.filter(n => n.id !== id));
    if (wasUnread) setUnread(u => Math.max(0, u - 1));
  };

  const handleClick = (n: AppNotification) => {
    if (!n.is_read) markRead(n.id);
    const path = entityPath(n.entity_type, n.entity_id);
    if (path) { setOpen(false); navigate(path); }
  };

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-full text-brand-grey hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
        title="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1 shadow animate-pulse">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[480px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 flex flex-col overflow-hidden animate-in slide-in-from-top-1 fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white" title="Close notifications" aria-label="Close notifications">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => {
                const cfg = typeConfig[n.type] || typeConfig.info;
                const Icon = cfg.icon;
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                      !n.is_read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                    }`}
                    onClick={() => handleClick(n)}
                  >
                    <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${cfg.bg}`}>
                      <Icon size={16} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className="mt-1 w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-400">{timeAgo(n.created_at)}</span>
                        {n.email_sent === 1 && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5" title="Email sent">
                            ✉ sent
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0 ml-1">
                      {!n.is_read && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                          className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                          title="Mark as read"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); remove(n.id, !n.is_read); }}
                        className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
