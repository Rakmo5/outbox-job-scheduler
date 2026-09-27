'use client';

import React from 'react';
import { Search, SlidersHorizontal, RotateCw } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export default function Header({ searchQuery, setSearchQuery, onRefresh, loading }: HeaderProps) {
  return (
    <header className="h-16 border-b border-gray-100 bg-white px-6 flex items-center justify-between gap-4">
      {/* Search Input Bar */}
      <div className="relative flex-1 max-w-xl">
        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search"
          className="w-full pl-11 pr-4 py-2.5 bg-[#F5F5F5] focus:bg-white border border-transparent focus:border-gray-200 rounded-full text-xs text-gray-800 placeholder:text-gray-400 outline-none transition-all"
        />
      </div>

      {/* Action Icons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          title="Filter options"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onRefresh}
          title="Refresh list"
          className={`p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer ${
            loading ? 'animate-spin text-emerald-600' : ''
          }`}
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
