'use client';

import React, { useState } from 'react';
import { Clock, Send, ChevronDown, Plus, LogOut, Bell, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  activeTab: 'scheduled' | 'sent';
  setActiveTab: (tab: 'scheduled' | 'sent') => void;
  scheduledCount: number;
  sentCount: number;
  onOpenCompose: () => void;
  onOpenSlackModal: () => void;
  slackConnected: boolean;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  scheduledCount,
  sentCount,
  onOpenCompose,
  onOpenSlackModal,
  slackConnected,
}: SidebarProps) {
  const router = useRouter();
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-100 flex flex-col p-4 select-none shrink-0">
      {/* Brand Logo */}
      <div className="flex items-center gap-2 px-2 py-3 mb-2">
        <span className="text-2xl font-extrabold tracking-tighter text-black font-sans">
          ONB
        </span>
      </div>

      {/* User Profile Card */}
      <div className="relative mb-6">
        <button
          onClick={() => setShowUserDropdown(!showUserDropdown)}
          className="w-full bg-[#F5F5F5] hover:bg-gray-200 transition-colors p-2.5 rounded-2xl flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
              alt="User avatar"
              className="w-8 h-8 rounded-full object-cover shrink-0 border border-white"
            />
            <div className="overflow-hidden">
              <h4 className="text-xs font-semibold text-gray-900 truncate">Oliver Brown</h4>
              <p className="text-[11px] text-gray-500 truncate">oliver.brown@domain.io</p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
        </button>

        {/* Dropdown Menu */}
        {showUserDropdown && (
          <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Compose Button */}
      <button
        onClick={onOpenCompose}
        className="w-full py-2.5 px-4 mb-6 border border-[#00A859] text-[#00A859] hover:bg-[#E6F4EA] transition-colors rounded-full font-medium text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
        Compose
      </button>

      {/* CORE Navigation Section */}
      <div className="flex-1 flex flex-col gap-1">
        <span className="text-[10px] font-bold text-gray-400 tracking-wider px-3 mb-1">
          CORE
        </span>

        {/* Scheduled Tab */}
        <button
          onClick={() => setActiveTab('scheduled')}
          className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'scheduled'
              ? 'bg-[#E6F4EA] text-[#00A859] font-semibold'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4" />
            <span>Scheduled</span>
          </div>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full ${
              activeTab === 'scheduled'
                ? 'bg-white text-[#00A859] font-bold'
                : 'text-gray-400'
            }`}
          >
            {scheduledCount}
          </span>
        </button>

        {/* Sent Tab */}
        <button
          onClick={() => setActiveTab('sent')}
          className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'sent'
              ? 'bg-[#E6F4EA] text-[#00A859] font-semibold'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Send className="w-4 h-4" />
            <span>Sent</span>
          </div>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full ${
              activeTab === 'sent'
                ? 'bg-white text-[#00A859] font-bold'
                : 'text-gray-400'
            }`}
          >
            {sentCount}
          </span>
        </button>
      </div>

      {/* Integrations & Queue Monitor Footer Links */}
      <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
        <button
          onClick={onOpenSlackModal}
          className="w-full px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded-xl flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-gray-500" />
            <span>Slack Alerts</span>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              slackConnected
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {slackConnected ? 'Connected' : 'Setup'}
          </span>
        </button>

        <a
          href="http://localhost:5000/admin/queues"
          target="_blank"
          rel="noreferrer"
          className="w-full px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded-xl flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-purple-600" />
            <span>BullMQ Live Board</span>
          </div>
          <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-full">
            Live ↗
          </span>
        </a>
      </div>
    </aside>
  );
}
