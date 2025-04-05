import { MetaMaskProvider as MetaMaskSDKProvider } from '@metamask/sdk-react';
import { ReactNode } from 'react';

interface MetaMaskProviderProps {
  children: ReactNode;
}

const MetaMaskProvider = ({ children }: MetaMaskProviderProps) => {
  return (
    <MetaMaskSDKProvider
      debug={false}
      sdkOptions={{
        dappMetadata: {
          name: "HashScope",
          url: typeof window !== 'undefined' ? window.location.href : '',
        }
      }}
    >
      {children}
    </MetaMaskSDKProvider>
  );
};

export default MetaMaskProvider; 