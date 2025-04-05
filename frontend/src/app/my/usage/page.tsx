'use client';

import { UsageTable } from '@/components/UsageTable';

export default function UsagePage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white/80 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-[#9945FF] via-[#00D1FF] to-[#14F195] text-transparent bg-clip-text">
          API Key Usage
        </h1>
        <div className="bg-gradient-to-br from-[rgba(255,255,255,0.9)] to-[rgba(255,255,255,0.7)] backdrop-blur-xl border border-[rgba(0,0,0,0.08)] rounded-lg p-6 shadow-sm">
          <UsageTable />
        </div>
      </div>
    </div>
  );
} 