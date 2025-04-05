import MetaMaskAuth from '@/components/MetaMaskAuth';

export default function MetaMaskPage() {
  return (
    <div className="min-h-screen bg-gray-800 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-white">My Profile</h1>
        <p className="text-gray-300 mb-6">Manage your account settings and wallet connection.</p>
        <div className="bg-gray-700 rounded-lg shadow-lg p-6">
          <MetaMaskAuth />
        </div>
      </div>
    </div>
  );
} 