'use client';

import React, { useState } from 'react';
import { Bell, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { connectSlackWebhook } from '../services/api';

interface SlackConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  slackConnected: boolean;
  onStatusChange: () => void;
}

export default function SlackConnectModal({
  isOpen,
  onClose,
  slackConnected,
  onStatusChange,
}: SlackConnectModalProps) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl || !webhookUrl.includes('hooks.slack.com')) {
      setError('Please enter a valid Slack Incoming Webhook URL (e.g. https://hooks.slack.com/services/...)');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await connectSlackWebhook(webhookUrl);
      setSuccess(true);
      onStatusChange();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to connect Slack');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 relative border border-gray-100 flex flex-col gap-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#00A859] flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Connect Slack Alerts</h3>
            <p className="text-xs text-gray-500">
              Receive live notifications when sender rate limits are hit
            </p>
          </div>
        </div>

        {slackConnected && !success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Slack is currently connected and receiving rate-limit alerts!</span>
          </div>
        )}

        {success ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col items-center justify-center text-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-[#00A859]" />
            <h4 className="text-sm font-bold text-gray-900">Slack Connected Successfully!</h4>
            <p className="text-xs text-gray-500">
              A test verification message was dispatched to your Slack channel.
            </p>
          </div>
        ) : (
          <form onSubmit={handleConnect} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">
                Slack Incoming Webhook URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
                className="w-full px-3 py-2.5 bg-[#F5F5F5] border border-transparent focus:border-emerald-500 focus:bg-white rounded-xl text-xs outline-none transition-all"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Create an Incoming Webhook in your Slack App and paste the URL here.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-gray-500 hover:bg-gray-100 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-[#00A859] hover:bg-[#00924D] text-white text-xs font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Connecting...' : 'Connect Slack'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
