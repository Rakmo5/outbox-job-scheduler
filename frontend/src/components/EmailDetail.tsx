'use client';

import React from 'react';
import { ArrowLeft, Star, Folder, Trash2, ExternalLink } from 'lucide-react';
import { EmailScheduleItem } from '../services/api';

interface EmailDetailProps {
  email: EmailScheduleItem;
  onBack: () => void;
}

export default function EmailDetail({ email, onBack }: EmailDetailProps) {
  const formattedDate = new Date(email.scheduledAt || email.createdAt).toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }
  );

  return (
    <div className="flex-1 bg-white flex flex-col h-full overflow-y-auto">
      {/* Top Header Navigation */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-4 overflow-hidden">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold text-gray-900 truncate">
            {email.subject}
          </h2>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3 text-gray-400">
          {email.etherealMessageUrl && (
            <a
              href={email.etherealMessageUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ethereal Web Preview
            </a>
          )}
          <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <Star className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <Folder className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Email Content Area */}
      <div className="p-8 max-w-4xl mx-auto w-full flex-1 flex flex-col gap-6">
        {/* Sender Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#00A859] text-white flex items-center justify-center font-bold text-sm">
              {email.senderEmail ? email.senderEmail[0].toUpperCase() : 'A'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">
                  {email.senderEmail || 'Oliver Brown'}
                </h3>
                <span className="text-xs text-gray-400">
                  &lt;{email.senderEmail}&gt;
                </span>
              </div>
              <p className="text-xs text-gray-500">
                to {email.recipientEmail}
              </p>
            </div>
          </div>
          <span className="text-xs text-gray-400 font-medium">{formattedDate}</span>
        </div>

        {/* Email Callout Box & HTML Content */}
        <div className="text-sm text-gray-800 leading-relaxed space-y-4 pt-4 border-t border-gray-100">
          <div
            dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
            className="prose max-w-none"
          />

          {/* Sample Callout Box matching Figma Image 4 if custom text isn't rich */}
          {!email.bodyHtml.includes('Extremely Exclusive') && (
            <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-xl my-4 text-amber-900 text-xs font-medium leading-relaxed">
              ⚡ <strong>Extremely Exclusive—Only 4 Spots Worldwide Per Year | $25,000 investment</strong> ⚡
              <br />
              To explore securing your private transformation, simply reply right now.
            </div>
          )}
        </div>

        {/* Attachments Section matching Figma Image 4 */}
        <div className="pt-6 border-t border-gray-100">
          <h4 className="text-xs font-bold text-gray-500 mb-3">Attachments (2)</h4>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-48 border border-gray-200 rounded-xl overflow-hidden bg-slate-50 shadow-sm hover:shadow transition-shadow">
              <div className="h-28 bg-emerald-600 flex items-center justify-center relative overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=400&auto=format&fit=crop&q=80"
                  alt="Tennis Coach Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2.5 bg-white">
                <p className="text-xs font-semibold text-gray-800 truncate">Tennis_Coach_Profile.png</p>
                <p className="text-[10px] text-gray-400">1.2 MB</p>
              </div>
            </div>

            <div className="w-48 border border-gray-200 rounded-xl overflow-hidden bg-slate-50 shadow-sm hover:shadow transition-shadow">
              <div className="h-28 bg-emerald-600 flex items-center justify-center relative overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=400&auto=format&fit=crop&q=80"
                  alt="Tennis Coach Profile 2"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2.5 bg-white">
                <p className="text-xs font-semibold text-gray-800 truncate">Tennis_Coach_Profile2.png</p>
                <p className="text-[10px] text-gray-400">1.2 MB</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
