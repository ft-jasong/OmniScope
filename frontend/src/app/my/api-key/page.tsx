'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Copy, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@/contexts/WalletContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ApiKey {
  key_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  expires_at: string;
  rate_limit_per_minute: number;
  call_count: number;
  last_used_at: string;
}

interface NewApiKey {
  key_id: string;
  secret_key: string;
  name: string;
  is_active: boolean;
  created_at: string;
  expires_at: string;
  rate_limit_per_minute: number;
}

export default function SecretPage() {
  const { account } = useWallet();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKey, setNewKey] = useState<NewApiKey | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    rate_limit_per_minute: 60
  });

  useEffect(() => {
    if (account) {
      fetchApiKeys();
    }
  }, [account]);

  const fetchApiKeys = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api-keys/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch API keys');
      const data = await response.json();
      setApiKeys(data);
    } catch (error) {
      toast.error('Failed to fetch API keys');
      console.error('Error fetching API keys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api-keys/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Failed to create API key');
      const data = await response.json();
      setNewKey(data);
      setShowSecret(true);
      toast.success('API key created successfully');
      fetchApiKeys();
    } catch (error) {
      toast.error('Failed to create API key');
      console.error('Error creating API key:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const deleteApiKey = async (keyId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete API key');
      
      toast.success('API key deleted successfully');
      fetchApiKeys(); // Refresh the list
    } catch (error) {
      toast.error('Failed to delete API key');
      console.error('Error deleting API key:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (keyId: string) => {
    setDeleteKeyId(keyId);
  };

  const handleDeleteConfirm = async () => {
    if (deleteKeyId) {
      await deleteApiKey(deleteKeyId);
      setDeleteKeyId(null);
    }
  };

  if (!account) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-white/80 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-gray-700">Please connect your wallet</h1>
            <p className="text-gray-500">You need to connect your wallet to access the Secret page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white/80 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-[#9945FF] to-[#14F195] text-transparent bg-clip-text">API Key Management</h1>
        
        {/* API Host Information */}
        <Card className="mb-8 bg-white border-[rgba(0,0,0,0.08)]">
          <CardHeader>
            <CardTitle className="text-gray-700">API Host Information</CardTitle>
            <CardDescription className="text-gray-500">Base URL for all API endpoints</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <code className="bg-[rgba(0,0,0,0.02)] px-3 py-2 rounded text-gray-700 font-mono">
                {process.env.NEXT_PUBLIC_API_BASE_URL || 'https://hashkey.sungwoonsong.com'}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(process.env.NEXT_PUBLIC_API_BASE_URL || 'https://hashkey.sungwoonsong.com')}
                className="text-gray-500 hover:text-[#9945FF]"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Create New API Key Form */}
        <Card className="mb-8 bg-white border-[rgba(0,0,0,0.08)]">
          <CardHeader>
            <CardTitle className="text-gray-700">Create New API Key</CardTitle>
            <CardDescription className="text-gray-500">Generate a new API key for your application</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createApiKey} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700">Key Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter a name for your API key"
                  className="bg-white border-[rgba(0,0,0,0.08)] text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-[#9945FF] focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate_limit" className="text-gray-700">Request Limit (per minute)</Label>
                <Input
                  id="rate_limit"
                  type="number"
                  value={formData.rate_limit_per_minute}
                  onChange={(e) => setFormData({ ...formData, rate_limit_per_minute: parseInt(e.target.value) })}
                  min="1"
                  max="1000"
                  className="bg-white border-[rgba(0,0,0,0.08)] text-gray-700 focus:ring-2 focus:ring-[#9945FF] focus:border-transparent"
                />
              </div>
              <Button type="submit" disabled={isLoading} className="bg-[#9945FF] hover:bg-[#8A3EE8] text-white">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create API Key
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* New API Key Display */}
        {newKey && showSecret && (
          <Card className="mb-8 bg-[rgba(153,69,255,0.05)] border-[rgba(153,69,255,0.2)]">
            <CardHeader>
              <CardTitle className="text-[#9945FF]">New API Key Created</CardTitle>
              <CardDescription className="text-gray-600">
                Make sure to copy your secret key now. You won&apos;t be able to see it again!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-700">Key ID</Label>
                  <div className="flex items-center space-x-2">
                    <Input value={newKey.key_id} readOnly className="bg-white border-[rgba(0,0,0,0.08)] text-gray-700" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(newKey.key_id)}
                      className="border-[rgba(0,0,0,0.08)] hover:bg-[rgba(153,69,255,0.05)] text-gray-700"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-700">Secret Key</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type={showSecret ? "text" : "password"}
                      value={newKey.secret_key}
                      readOnly
                      className="bg-white border-[rgba(0,0,0,0.08)] text-gray-700"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(newKey.secret_key)}
                      className="border-[rgba(0,0,0,0.08)] hover:bg-[rgba(153,69,255,0.05)] text-gray-700"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* API Keys List */}
        <Card className="bg-white border-[rgba(0,0,0,0.08)]">
          <CardHeader>
            <CardTitle className="text-gray-700">Your API Keys</CardTitle>
            <CardDescription className="text-gray-500">Manage your existing API keys</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#9945FF]" />
              </div>
            ) : apiKeys.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No API keys found</p>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <Card key={key.key_id} className="bg-white border-[rgba(0,0,0,0.08)] hover:shadow-md transition-all">
                    <CardContent>
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h3 className="font-semibold text-gray-700">{key.name || 'Unnamed Key'}</h3>
                          <p className="text-sm text-gray-500">ID: {key.key_id}</p>
                          <p className="text-sm text-gray-500">
                            Created: {new Date(key.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            Request Limit: {key.rate_limit_per_minute} requests/minute
                          </p>
                          <p className="text-sm text-gray-500">
                            Calls: {key.call_count}
                          </p>
                          <p className="text-sm text-gray-500">
                            Last Used: {new Date(key.last_used_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            key.is_active ? 'bg-[rgba(20,241,149,0.1)] text-[#14F195]' : 'bg-[rgba(255,0,0,0.1)] text-red-500'
                          }`}>
                            {key.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(key.key_id)}
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-[rgba(255,0,0,0.05)]"
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Modal */}
        <Dialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
          <DialogContent className="bg-white border-[rgba(0,0,0,0.08)]">
            <DialogHeader>
              <DialogTitle className="text-gray-700">Delete API Key</DialogTitle>
              <DialogDescription className="text-gray-500">
                Are you sure you want to delete this API key? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteKeyId(null)}
                className="border-[rgba(0,0,0,0.08)] text-gray-700 hover:bg-[rgba(153,69,255,0.05)]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                className="bg-red-500 text-white hover:bg-red-600"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 