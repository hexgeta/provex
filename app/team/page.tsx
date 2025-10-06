'use client';

import TeamStakingInterface from '@/components/TeamStakingInterface';

export default function TeamPage() {
  return (
    <main className="flex min-h-screen flex-col items-center pb-24">
      <div className="w-full px-2 md:px-8 mt-24">
        <div className="max-w-6xl mx-auto">
          <TeamStakingInterface />
        </div>
      </div>
    </main>
  );
}