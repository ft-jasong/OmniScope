import MetaMaskAuth from '@/components/MetaMaskAuth';

export default function MetaMaskPage() {
  return (
    <div className="bg-white/80 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9945FF] via-[#00D1FF] to-[#14F195] text-transparent bg-clip-text">My Profile</h1>
        <p className="text-gray-600 mb-6">Manage your account settings and wallet connection.</p>
        <div className="bg-white backdrop-blur-xl rounded-lg shadow-sm border border-[rgba(0,0,0,0.08)] p-6">
          <MetaMaskAuth />
        </div>
      </div>
    </div>
  );
} 