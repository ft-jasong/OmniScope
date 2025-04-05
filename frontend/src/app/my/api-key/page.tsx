'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSDK } from '@metamask/sdk-react';
import { Loader2, Copy, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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
  const { connected } = useSDK();
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
    if (connected) {
      fetchApiKeys();
    }
  }, [connected]);

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

  if (!connected) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-white">Please connect your wallet</h1>
            <p className="text-gray-400">You need to connect your wallet to access the Secret page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-white">API Key Management</h1>
        
        {/* API Host Information */}
        <Card className="mb-8 bg-gray-700 border-gray-600">
          <CardHeader>
            <CardTitle className="text-white">API Host Information</CardTitle>
            <CardDescription className="text-gray-400">Base URL for all API endpoints</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <code className="bg-gray-800 px-3 py-2 rounded text-white font-mono">
                {process.env.NEXT_PUBLIC_API_BASE_URL || 'https://hashkey.sungwoonsong.com'}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(process.env.NEXT_PUBLIC_API_BASE_URL || 'https://hashkey.sungwoonsong.com')}
                className="text-gray-400 hover:text-white"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Create New API Key Form */}
        <Card className="mb-8 bg-gray-700 border-gray-600">
          <CardHeader>
            <CardTitle className="text-white">Create New API Key</CardTitle>
            <CardDescription className="text-gray-400">Generate a new API key for your application</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createApiKey} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">Key Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter a name for your API key"
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate_limit" className="text-gray-300">Request Limit (per minute)</Label>
                <Input
                  id="rate_limit"
                  type="number"
                  value={formData.rate_limit_per_minute}
                  onChange={(e) => setFormData({ ...formData, rate_limit_per_minute: parseInt(e.target.value) })}
                  min="1"
                  max="1000"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create API Key
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* New API Key Display */}
        {newKey && showSecret && (
          <Card className="mb-8 bg-yellow-900/20 border-yellow-800">
            <CardHeader>
              <CardTitle className="text-yellow-200">New API Key Created</CardTitle>
              <CardDescription className="text-yellow-300">
                Make sure to copy your secret key now. You won&apos;t be able to see it again!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Key ID</Label>
                  <div className="flex items-center space-x-2">
                    <Input value={newKey.key_id} readOnly className="bg-gray-800 border-gray-700 text-white" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(newKey.key_id)}
                      className="border-gray-600 hover:bg-gray-700 text-gray-300"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300">Secret Key</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type={showSecret ? "text" : "password"}
                      value={newKey.secret_key}
                      readOnly
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(newKey.secret_key)}
                      className="border-gray-600 hover:bg-gray-700 text-gray-300"
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
        <Card className="bg-gray-700 border-gray-600">
          <CardHeader>
            <CardTitle className="text-white">Your API Keys</CardTitle>
            <CardDescription className="text-gray-400">Manage your existing API keys</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : apiKeys.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No API keys found</p>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <Card key={key.key_id} className="bg-gray-800 border-gray-700">
                    <CardContent>
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h3 className="font-semibold text-white">{key.name || 'Unnamed Key'}</h3>
                          <p className="text-sm text-gray-400">ID: {key.key_id}</p>
                          <p className="text-sm text-gray-400">
                            Created: {new Date(key.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-400">
                            Request Limit: {key.rate_limit_per_minute} requests/minute
                          </p>
                          <p className="text-sm text-gray-400">
                            Calls: {key.call_count}
                          </p>
                          <p className="text-sm text-gray-400">
                            Last Used: {new Date(key.last_used_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            key.is_active ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'
                          }`}>
                            {key.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(key.key_id)}
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
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
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Delete API Key</DialogTitle>
              <DialogDescription className="text-gray-400">
                Are you sure you want to delete this API key? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteKeyId(null)}
                className="bg-gray-700 text-gray-300 hover:bg-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                className="bg-red-600 text-white hover:bg-red-700"
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