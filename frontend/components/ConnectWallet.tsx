import { useSDK } from '@metamask/sdk-react';
import { useEffect, useState } from 'react';
import { formatAddress, formatBalance, formatChainAsNum } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const ConnectWallet = () => {
  const [account, setAccount] = useState<string>();
  const [balance, setBalance] = useState<string>();
  const [chainId, setChainId] = useState<string>();
  const { sdk, connected, connecting, provider } = useSDK();

  useEffect(() => {
    if (connected && provider) {
      // Get account, balance and chainId
      const getAccountDetails = async () => {
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (!accounts || !Array.isArray(accounts) || accounts.length === 0) return;
        
        const balance = await provider.request({
          method: 'eth_getBalance',
          params: [accounts[0], 'latest'],
        });
        const chainId = await provider.request({ method: 'eth_chainId' });

        setAccount(accounts[0]);
        setBalance(formatBalance(balance as string));
        setChainId(formatChainAsNum(chainId as string).toString());
      };

      getAccountDetails();
    }
  }, [connected, provider]);

  const connect = async () => {
    try {
      await sdk?.connect();
    } catch (err) {
      console.warn(`No accounts found`, err);
    }
  };

  const disconnect = async () => {
    try {
      await sdk?.disconnect();
      setAccount(undefined);
      setBalance(undefined);
      setChainId(undefined);
    } catch (err) {
      console.warn(`Failed to disconnect`, err);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {connected ? (
        <>
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium">
              {formatAddress(account)} ({balance} ETH)
            </span>
            <span className="text-xs text-gray-500">Chain ID: {chainId}</span>
          </div>
          <Button
            onClick={disconnect}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            Disconnect
          </Button>
        </>
      ) : (
        <Button
          disabled={connecting}
          onClick={connect}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {connecting ? 'Connecting...' : 'Connect Wallet'}
        </Button>
      )}
    </div>
  );
};

export default ConnectWallet; 