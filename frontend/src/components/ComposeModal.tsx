'use client';

import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Upload,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  X,
  Calendar,
} from 'lucide-react';
import { scheduleEmailBatch, parseCsvFile } from '../services/api';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ComposeModal({ isOpen, onClose, onSuccess }: ComposeModalProps) {
  const [senderEmail, setSenderEmail] = useState('oliver.brown@domain.io');
  const [recipientsInput, setRecipientsInput] = useState('');
  const [recipientPills, setRecipientPills] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [delayBetweenMs, setDelayBetweenMs] = useState('2000');
  const [hourlyLimit, setHourlyLimit] = useState('50');
  const [bodyHtml, setBodyHtml] = useState('');
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [showSendLater, setShowSendLater] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle CSV file upload & email extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const data = await parseCsvFile(file);
      if (data.emails && data.emails.length > 0) {
        setRecipientPills(data.emails);
      }
    } catch (err: any) {
      alert('Error parsing CSV file: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add individual recipient email manually
  const handleAddRecipient = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = recipientsInput.trim().replace(',', '');
      if (val && !recipientPills.includes(val)) {
        setRecipientPills([...recipientPills, val]);
        setRecipientsInput('');
      }
    }
  };

  const removeRecipient = (index: number) => {
    setRecipientPills(recipientPills.filter((_, i) => i !== index));
  };

  // Preset time helper
  const setPresetTime = (preset: string) => {
    const d = new Date();
    if (preset.includes('Tomorrow')) {
      d.setDate(d.getDate() + 1);
    }
    if (preset.includes('10:00 AM')) {
      d.setHours(10, 0, 0, 0);
    } else if (preset.includes('11:00 AM')) {
      d.setHours(11, 0, 0, 0);
    } else if (preset.includes('3:00 PM')) {
      d.setHours(15, 0, 0, 0);
    } else {
      d.setHours(9, 0, 0, 0);
    }
    setScheduledAt(d.toISOString());
  };

  // Schedule email batch call
  const handleScheduleSubmit = async (isSendNow = false) => {
    let finalRecipients = [...recipientPills];
    if (recipientsInput.trim()) {
      finalRecipients.push(recipientsInput.trim());
    }

    if (finalRecipients.length === 0) {
      alert('Please enter or upload at least one recipient email address.');
      return;
    }

    if (!subject.trim()) {
      alert('Please enter a subject line.');
      return;
    }

    try {
      setLoading(true);
      const targetTime = isSendNow
        ? new Date().toISOString()
        : scheduledAt || new Date().toISOString();

      await scheduleEmailBatch({
        senderEmail,
        recipients: finalRecipients,
        subject,
        bodyHtml: bodyHtml || '<p>Hi, just wanted to follow up on our email...</p>',
        scheduledAt: targetTime,
        delayBetweenMs: parseInt(delayBetweenMs, 10) || 2000,
        maxEmailsPerHour: parseInt(hourlyLimit, 10) || 50,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Failed to schedule email: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative border border-gray-100">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-gray-900">Compose New Email</h2>
          </div>

          <div className="flex items-center gap-3 relative">
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors cursor-pointer relative"
              title="Attachment"
            >
              <Paperclip className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded-full flex items-center justify-center">
                1
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowSendLater(!showSendLater)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors cursor-pointer"
              title="Send Later Options"
            >
              <Clock className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleScheduleSubmit(false)}
              disabled={loading}
              className="px-5 py-2 border border-[#00A859] text-[#00A859] hover:bg-[#E6F4EA] transition-colors rounded-full font-semibold text-xs cursor-pointer disabled:opacity-50"
            >
              Send Later
            </button>

            <button
              onClick={() => handleScheduleSubmit(true)}
              disabled={loading}
              className="px-6 py-2 bg-[#00A859] hover:bg-[#00924D] text-white rounded-full font-semibold text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Scheduling...' : 'Send'}
            </button>

            {/* Send Later Popover Modal matching Figma Image 5 */}
            {showSendLater && (
              <div className="absolute right-0 top-12 w-80 bg-white border border-gray-100 shadow-xl rounded-2xl p-4 z-50 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-gray-900">Send Later</h4>

                <div>
                  <label className="text-[10px] text-gray-400 font-semibold mb-1 block">
                    Pick date & time
                  </label>
                  <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-slate-50">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <input
                      type="datetime-local"
                      value={scheduledAt ? scheduledAt.slice(0, 16) : ''}
                      onChange={(e) => setScheduledAt(new Date(e.target.value).toISOString())}
                      className="bg-transparent text-xs w-full outline-none text-gray-800"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100">
                  {['Tomorrow', 'Tomorrow, 10:00 AM', 'Tomorrow, 11:00 AM', 'Tomorrow, 3:00 PM'].map(
                    (preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setPresetTime(preset)}
                        className="text-left text-xs py-1.5 px-2 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-gray-600 transition-colors font-medium"
                      >
                        {preset}
                      </button>
                    )
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => setShowSendLater(false)}
                    className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowSendLater(false)}
                    className="px-4 py-1.5 text-xs bg-[#00A859] text-white rounded-full font-semibold hover:bg-[#00924D]"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {/* From Selector */}
          <div className="flex items-center gap-4 py-2 border-b border-gray-100">
            <label className="w-16 text-xs font-semibold text-gray-400">From</label>
            <select
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              className="bg-[#F5F5F5] border border-transparent rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-800 outline-none cursor-pointer"
            >
              <option value="oliver.brown@domain.io">oliver.brown@domain.io</option>
              <option value="campaign.marketing@domain.io">campaign.marketing@domain.io</option>
              <option value="sales.outreach@domain.io">sales.outreach@domain.io</option>
            </select>
          </div>

          {/* To Recipient Field with Upload List matching Figma media_1790496712451.png */}
          <div className="flex items-start gap-4 py-2 border-b border-gray-100">
            <label className="w-16 text-xs font-semibold text-gray-400 pt-2">To</label>
            <div className="flex-1 flex flex-wrap items-center gap-2">
              {/* Dynamic Email Pill Tags */}
              {recipientPills.map((email, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-[#E6F4EA] border border-emerald-300 text-[#00A859] text-xs font-semibold rounded-full flex items-center gap-1.5"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => removeRecipient(idx)}
                    className="hover:text-emerald-900 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              <input
                type="text"
                value={recipientsInput}
                onChange={(e) => setRecipientsInput(e.target.value)}
                onKeyDown={handleAddRecipient}
                placeholder={recipientPills.length > 0 ? 'Add more...' : 'recipient@example.com'}
                className="flex-1 min-w-[200px] text-xs outline-none text-gray-800 py-1.5 placeholder:text-gray-400"
              />
            </div>

            {/* Upload List Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.txt"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold text-[#00A859] hover:underline flex items-center gap-1 cursor-pointer shrink-0 pt-1"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload List
            </button>
          </div>

          {/* Subject Field */}
          <div className="flex items-center gap-4 py-2 border-b border-gray-100">
            <label className="w-16 text-xs font-semibold text-gray-400">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1 text-xs outline-none text-gray-800 py-1.5 placeholder:text-gray-400 font-medium"
            />
          </div>

          {/* Delay & Hourly Limit Row */}
          <div className="flex items-center gap-8 py-2">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-gray-400">
                Delay between 2 emails
              </label>
              <input
                type="number"
                value={delayBetweenMs}
                onChange={(e) => setDelayBetweenMs(e.target.value)}
                placeholder="2000"
                className="w-20 px-3 py-1.5 bg-[#F5F5F5] rounded-xl text-xs font-semibold text-center outline-none"
              />
              <span className="text-[10px] text-gray-400">ms</span>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-gray-400">Hourly Limit</label>
              <input
                type="number"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(e.target.value)}
                placeholder="50"
                className="w-20 px-3 py-1.5 bg-[#F5F5F5] rounded-xl text-xs font-semibold text-center outline-none"
              />
              <span className="text-[10px] text-gray-400">/hr</span>
            </div>
          </div>

          {/* Rich Text Editor Container matching Figma Images */}
          <div className="flex-1 border border-gray-100 rounded-2xl overflow-hidden flex flex-col bg-[#FAFAFA]">
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-100 p-2 flex items-center gap-1 flex-wrap text-gray-500">
              <button className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
                <Undo className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
                <Redo className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-gray-200 mx-1"></div>
              <button className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
                <Underline className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-gray-200 mx-1"></div>
              <button className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
                <List className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
                <LinkIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              placeholder="Type Your Reply..."
              className="w-full flex-1 p-4 bg-transparent text-xs text-gray-800 outline-none resize-none placeholder:text-gray-400"
            />

            {/* Attachment preview image thumbnail matching Figma Images */}
            <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-3">
              <div className="w-24 h-16 rounded-xl border border-gray-200 overflow-hidden relative group">
                <img
                  src="https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=200&auto=format&fit=crop&q=80"
                  alt="Tennis attachment preview"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
