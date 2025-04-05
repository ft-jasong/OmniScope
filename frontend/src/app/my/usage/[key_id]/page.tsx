'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

type EndpointHistory = {
  endpoint: string;
  method: string;
  call_count: number;
  last_used_at: string;
  total_cost: number;
};

type ApiKeyHistory = {
  key_id: string;
  total_calls: number;
  total_cost: number;
  endpoints: EndpointHistory[];
};

type ApiKeyDetails = {
  key_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  expires_at: string;
  rate_limit_per_minute: number;
  call_count: number;
  last_used_at: string;
};

export default function ApiKeyHistoryPage() {
  const params = useParams();
  const [data, setData] = useState<ApiKeyHistory | null>(null);
  const [apiKeyDetails, setApiKeyDetails] = useState<ApiKeyDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // First fetch API key details
        const detailsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api-keys/${params.key_id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        });

        if (!detailsResponse.ok) {
          throw new Error('Failed to fetch API key details');
        }

        const details = await detailsResponse.json();
        setApiKeyDetails(details);

        // Then fetch history
        const historyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api-keys/${params.key_id}/history`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        });

        if (!historyResponse.ok) {
          throw new Error('Failed to fetch API key history');
        }

        const history = await historyResponse.json();
        setData(history);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to fetch data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params.key_id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-white">Loading API key history...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-red-500">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !apiKeyDetails) {
    return (
      <div className="min-h-screen bg-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-white">No data found.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/my/usage"
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to API Keys
          </Link>
          <h1 className="text-3xl font-bold text-white">API Key Usage History</h1>
        </div>
        <div className="bg-gray-700 rounded-lg p-6 space-y-6">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold text-white">
              <span className="text-gray-400">{apiKeyDetails.name}</span>
              <span className="mx-2">•</span>
              <span className="text-gray-400">ID: {apiKeyDetails.key_id}</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm">Total Calls</h3>
              <p className="text-2xl font-bold text-white">{data.total_calls.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm">Total Cost</h3>
              <p className="text-2xl font-bold text-white">{data.total_cost.toLocaleString()} HSK</p>
            </div>
          </div>

          <div className="rounded-md border border-gray-600">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-800">
                  <TableHead className="text-white">Endpoint</TableHead>
                  <TableHead className="text-white">Method</TableHead>
                  <TableHead className="text-white text-right">Calls</TableHead>
                  <TableHead className="text-white">Last Used</TableHead>
                  <TableHead className="text-white text-right">Cost (HSK)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.endpoints.map((endpoint, index) => (
                  <TableRow key={index} className="bg-gray-800 text-white hover:bg-gray-700">
                    <TableCell className="font-medium">{endpoint.endpoint}</TableCell>
                    <TableCell className="font-medium">{endpoint.method}</TableCell>
                    <TableCell className="text-right font-medium">{endpoint.call_count.toLocaleString()}</TableCell>
                    <TableCell className="font-medium">
                      {new Date(endpoint.last_used_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">{endpoint.total_cost.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}