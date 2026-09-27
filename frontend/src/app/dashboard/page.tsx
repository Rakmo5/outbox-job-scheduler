'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import EmailList from '../../components/EmailList';
import EmailDetail from '../../components/EmailDetail';
import ComposeModal from '../../components/ComposeModal';
import SlackConnectModal from '../../components/SlackConnectModal';
import {
  fetchScheduledEmails,
  fetchSentEmails,
  searchEmails,
  getSlackStatus,
  EmailScheduleItem,
} from '../../services/api';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [scheduledEmails, setScheduledEmails] = useState<EmailScheduleItem[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailScheduleItem[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailScheduleItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackModalOpen, setIsSlackModalOpen] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);

  // Load emails from backend
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (searchQuery.trim()) {
        const results = await searchEmails(
          searchQuery,
          activeTab === 'scheduled' ? 'SCHEDULED' : 'SENT'
        );
        if (activeTab === 'scheduled') {
          setScheduledEmails(results);
        } else {
          setSentEmails(results);
        }
      } else {
        const [scheduled, sent] = await Promise.all([
          fetchScheduledEmails(),
          fetchSentEmails(),
        ]);
        setScheduledEmails(scheduled);
        setSentEmails(sent);
      }
    } catch (err: any) {
      console.warn('Backend server connecting...', err.message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeTab]);

  // Check Slack status
  const checkSlack = async () => {
    try {
      const res = await getSlackStatus();
      setSlackConnected(res.connected);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    loadData();
    checkSlack();

    // Auto-refresh emails every 5 seconds for live status changes
    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadData]);

  const displayedEmails = activeTab === 'scheduled' ? scheduledEmails : sentEmails;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedEmail(null);
        }}
        scheduledCount={scheduledEmails.length}
        sentCount={sentEmails.length}
        onOpenCompose={() => setIsComposeOpen(true)}
        onOpenSlackModal={() => setIsSlackModalOpen(true)}
        slackConnected={slackConnected}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onRefresh={loadData}
          loading={loading}
        />

        {selectedEmail ? (
          <EmailDetail
            email={selectedEmail}
            onBack={() => setSelectedEmail(null)}
          />
        ) : (
          <EmailList
            emails={displayedEmails}
            activeTab={activeTab}
            onSelectEmail={setSelectedEmail}
            loading={loading}
          />
        )}
      </main>

      {/* Compose Email Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={loadData}
      />

      {/* Slack Connection Modal */}
      <SlackConnectModal
        isOpen={isSlackModalOpen}
        onClose={() => setIsSlackModalOpen(false)}
        slackConnected={slackConnected}
        onStatusChange={checkSlack}
      />
    </div>
  );
}
