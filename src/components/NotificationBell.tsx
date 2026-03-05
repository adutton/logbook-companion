import React, { useEffect, useRef, useState } from 'react';
import { Bell, ClipboardList, Trophy, UserPlus, BarChart3, Info, CheckCheck } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import type { NotificationType } from '../types/notification.types';

const typeIcon: Record<NotificationType, React.FC<{ size?: number; className?: string }>> = {
  assignment_created: ClipboardList,
  assignment_reminder: ClipboardList,
  pr_achieved: Trophy,
  athlete_joined: UserPlus,
  score_entered: BarChart3,
  system: Info,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex items-center gap-3 px-4 py-3 w-full text-left text-neutral-400 hover:text-white hover:bg-neutral-800/50 rounded-lg transition-all"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell size={20} />
        <span className="md:inline hidden">Notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-2 left-8 md:static md:ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-full ml-2 bottom-0 w-80 max-h-96 overflow-y-auto bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-[60]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700/50">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-neutral-500">
              <Bell size={32} className="mb-3 opacity-40" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-800">
              {notifications.map((n) => {
                const Icon = typeIcon[n.type] ?? Info;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!n.read) markAsRead(n.id);
                        if (n.href) {
                          setOpen(false);
                          window.location.href = n.href;
                        }
                      }}
                      className={`flex items-start gap-3 w-full text-left px-4 py-3 hover:bg-neutral-800/60 transition-colors ${
                        !n.read ? 'bg-neutral-800/30' : ''
                      }`}
                    >
                      <div className={`mt-0.5 shrink-0 ${!n.read ? 'text-emerald-400' : 'text-neutral-500'}`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm truncate ${!n.read ? 'font-semibold text-white' : 'text-neutral-300'}`}>
                            {n.title}
                          </span>
                          {!n.read && (
                            <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-400" />
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 line-clamp-2 mt-0.5">{n.body}</p>
                        <span className="text-[11px] text-neutral-500 mt-1 block">{timeAgo(n.created_at)}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
