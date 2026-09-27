'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { EmailScheduleItem } from '../services/api';

interface EmailListProps {
  emails: EmailScheduleItem[];
  activeTab: 'scheduled' | 'sent';
  onSelectEmail: (email: EmailScheduleItem) => void;
  loading: boolean;
}

export default function EmailList({
  emails,
  activeTab,
  onSelectEmail,
  loading,
}: EmailListProps) {
  if (loading) {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center text-gray-400 gap-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-medium">Loading emails...</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center text-gray-400 gap-2">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-2">
          📧
        </div>
        <h3 className="text-sm font-semibold text-gray-700">No emails found</h3>
        <p className="text-xs text-gray-400">
          {activeTab === 'scheduled'
            ? 'No scheduled emails in the queue.'
            : 'No sent emails yet.'}
        </p>
      </div>
    );
  }

  const formatScheduledTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.toLocaleDateString('en-US', { weekday: 'short' });
    const time = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    return `🕒 ${day} ${time}`;
  };

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
      {emails.map((email) => {
        const isScheduled = email.status === 'SCHEDULED' || email.status === 'RESCHEDULED';
        const recipientDisplay = email.recipientEmail || 'Recipient';
        const previewSnippet =
          email.bodyText ||
          email.bodyHtml.replace(/<[^>]+>/g, '').substring(0, 70);

        return (
          <div
            key={email.id}
            onClick={() => onSelectEmail(email)}
            className="group px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4 overflow-hidden flex-1 pr-4">
              {/* Recipient Name/Email */}
              <span className="w-40 font-bold text-xs text-gray-900 truncate shrink-0">
                To: {recipientDisplay.split('@')[0]}
              </span>

              {/* Status Badge */}
              {isScheduled ? (
                <span className="px-3 py-1 bg-[#FFF3E0] text-[#FF9500] text-[11px] font-semibold rounded-full shrink-0 flex items-center gap-1 border border-amber-200/50">
                  {formatScheduledTime(email.scheduledAt)}
                </span>
              ) : (
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[11px] font-semibold rounded-full shrink-0">
                  {email.status === 'SENT' ? 'Sent' : 'Failed'}
                </span>
              )}

              {/* Subject & Body Preview */}
              <div className="overflow-hidden truncate text-xs">
                <span className="font-semibold text-gray-800 mr-2">
                  {email.subject}
                </span>
                <span className="text-gray-400 text-xs font-normal">
                  - {previewSnippet}...
                </span>
              </div>
            </div>

            {/* Star Favorite Icon */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="p-1 text-gray-300 hover:text-amber-400 transition-colors cursor-pointer"
            >
              <Star className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
