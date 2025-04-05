'use client';

import { MetaMaskProvider } from '@metamask/sdk-react';
import { ReactNode } from 'react';

interface MetaMaskProviderWrapperProps {
  children: ReactNode;
}

export default function MetaMaskProviderWrapper({ children }: MetaMaskProviderWrapperProps) {
  return (
    <MetaMaskProvider
      debug={false}
      sdkOptions={{
        dappMetadata: {
          name: "HashScope",
          url: typeof window !== 'undefined' ? window.location.href : '',
        }
      }}
    >
      {children}
    </MetaMaskProvider>
  );
} 