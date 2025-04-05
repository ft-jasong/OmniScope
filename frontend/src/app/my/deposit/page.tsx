"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ethers } from "ethers"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DepositInfo {
  message: string
  deposit_address: string
  amount: number
}

// HSKDeposit contract ABI
const HSKDepositABI = [
  {
    "inputs": [],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getBalance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

// HSK network settings
// const HSK_RPC_URL = process.env.NEXT_PUBLIC_HSK_RPC_URL || 'https://mainnet.hsk.xyz'

export default function DepositPage() {
  const [depositInfo, setDepositInfo] = useState<DepositInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [account, setAccount] = useState<string | null>(null)
  const [userBalance, setUserBalance] = useState('0')
  const [depositAmount, setDepositAmount] = useState('0.1')

  useEffect(() => {
    checkConnection()
    fetchDepositInfo()
    
    // Account change event listener
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        setAccount(accounts[0])
        if (accounts[0]) {
          fetchUserBalance(accounts[0])
        }
      })
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {})
      }
    }
  }, [])

  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[]
        setAccount(accounts[0])
        if (accounts[0]) {
          await fetchUserBalance(accounts[0])
        }
      } catch (error) {
        console.error('Connection error:', error)
        toast.error("Failed to connect wallet")
      }
    } else {
      toast.error("Please install HashKey wallet")
    }
  }

  const fetchUserBalance = async (userAddress: string) => {
    try {
      const token = localStorage.getItem("authToken")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users/${userAddress}/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch balance")
      }

      const data = await response.json()
      setUserBalance(data.formatted_balance || '0')
    } catch (error) {
      console.error('Balance fetch error:', error)
      toast.error("Failed to fetch balance")
    }
  }

  const fetchDepositInfo = async () => {
    try {
      const token = localStorage.getItem("authToken")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users/deposit/info`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch deposit info")
      }
      const data = await response.json()
      setDepositInfo(data)
      
      // Fetch balance after getting deposit info
      if (account) {
        await fetchUserBalance(account)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch deposit information")
    }
  }

  const handleDeposit = async () => {
    if (!depositInfo || !account) return

    // Validate deposit amount
    const amount = parseFloat(depositAmount)
    if (isNaN(amount) || amount < 0.001) {
      toast.error("Deposit amount must be at least 0.001 ADR")
      return
    }

    setIsLoading(true)
    try {
      if (!window.ethereum) {
        throw new Error("HashKey wallet is not installed")
      }

      // Switch to HSK network (chain ID needs to be updated for HSK network)
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xb1' }], // Update with actual HSK network chain ID
      })

      // Connect wallet
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()
      const contract = new ethers.Contract(depositInfo.deposit_address, HSKDepositABI, signer)

      // Convert amount to wei
      const amountWei = ethers.utils.parseEther(depositAmount)

      // Call deposit function
      const tx = await contract.deposit({ value: amountWei })
      toast.info("Transaction submitted. Waiting for confirmation...")

      // Wait for transaction confirmation
      await tx.wait()

      // Notify backend about the successful deposit
      try {
        const token = localStorage.getItem("authToken")
        if (!token) {
          throw new Error("No authentication token found")
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users/deposit/notify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            tx_hash: tx.hash,
            tx_type: "deposit"
          })
        })

        if (!response.ok) {
          throw new Error("Failed to notify deposit transaction")
        }
      } catch (error) {
        console.error('Failed to notify backend:', error)
        toast.error("Failed to notify backend")
      }

      // Update balance after successful deposit
      await fetchUserBalance(account)

      toast.success("Deposit successful!")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send transaction")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white/80 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#9945FF] via-[#00D1FF] to-[#14F195] text-transparent bg-clip-text">
          Deposit ADR
        </h1>
        <p className="text-gray-600 mb-6">Add funds to your account to use OmniScope services.</p>

        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-[rgba(255,255,255,0.9)] to-[rgba(255,255,255,0.7)] backdrop-blur-xl border border-[rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="text-gray-800">Current Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-[#9945FF] to-[#14F195] text-transparent bg-clip-text">
                {userBalance} ADR
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[rgba(255,255,255,0.9)] to-[rgba(255,255,255,0.7)] backdrop-blur-xl border border-[rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="text-gray-800">Make a Deposit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-gray-700">Amount (ADR)</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    min="0.001"
                    step="0.001"
                    className="pr-12"
                    placeholder="0.0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    ADR
                  </span>
                </div>
                <p className="text-sm text-gray-500">Minimum deposit: 0.001 ADR</p>
              </div>

              <Button
                onClick={handleDeposit}
                disabled={isLoading || !account}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⚡</span>
                    Processing...
                  </>
                ) : !account ? (
                  "Connect Wallet to Deposit"
                ) : (
                  "Deposit ADR"
                )}
              </Button>

              {depositInfo && (
                <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-[rgba(153,69,255,0.05)] to-[rgba(20,241,149,0.05)] border border-[rgba(0,0,0,0.08)]">
                  <p className="text-sm text-gray-600">{depositInfo.message}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Contract Address: {depositInfo.deposit_address}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 