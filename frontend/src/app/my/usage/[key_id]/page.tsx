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
      <div className="min-h-[calc(100vh-4rem)] bg-white/80 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-[rgba(255,255,255,0.9)] to-[rgba(255,255,255,0.7)] backdrop-blur-xl border border-[rgba(0,0,0,0.08)] rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-600">Loading API key history...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-white/80 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-[rgba(255,255,255,0.9)] to-[rgba(255,255,255,0.7)] backdrop-blur-xl border border-[rgba(0,0,0,0.08)] rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-center h-64">
              <div className="text-red-600">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !apiKeyDetails) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-white/80 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-[rgba(255,255,255,0.9)] to-[rgba(255,255,255,0.7)] backdrop-blur-xl border border-[rgba(0,0,0,0.08)] rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-600">No data found.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white/80 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/my/usage"
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Back to API Keys
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#9945FF] via-[#00D1FF] to-[#14F195] text-transparent bg-clip-text">
            API Key Usage History
          </h1>
        </div>
        <div className="bg-gradient-to-br from-[rgba(255,255,255,0.9)] to-[rgba(255,255,255,0.7)] backdrop-blur-xl border border-[rgba(0,0,0,0.08)] rounded-lg p-6 shadow-sm space-y-6">
          <div className="bg-gradient-to-r from-[rgba(153,69,255,0.05)] to-[rgba(20,241,149,0.05)] p-4 rounded-lg border border-[rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-semibold text-gray-700">
              <span className="text-gray-600">{apiKeyDetails.name}</span>
              <span className="mx-2 text-gray-400">•</span>
              <span className="text-gray-500">ID: {apiKeyDetails.key_id}</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-[rgba(153,69,255,0.05)] to-[rgba(20,241,149,0.05)] p-4 rounded-lg border border-[rgba(0,0,0,0.08)]">
              <h3 className="text-gray-500 text-sm">Total Calls</h3>
              <p className="text-2xl font-bold text-gray-700">{data.total_calls.toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-r from-[rgba(153,69,255,0.05)] to-[rgba(20,241,149,0.05)] p-4 rounded-lg border border-[rgba(0,0,0,0.08)]">
              <h3 className="text-gray-500 text-sm">Total Cost</h3>
              <p className="text-2xl font-bold text-gray-700">{data.total_cost.toLocaleString()} ADR</p>
            </div>
          </div>

          <div className="rounded-md border border-[rgba(0,0,0,0.08)]">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-[rgba(153,69,255,0.05)] to-[rgba(20,241,149,0.05)]">
                  <TableHead className="text-gray-700 font-semibold">Endpoint</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Method</TableHead>
                  <TableHead className="text-gray-700 font-semibold text-right">Calls</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Last Used</TableHead>
                  <TableHead className="text-gray-700 font-semibold text-right">Cost (ADR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.endpoints.map((endpoint, index) => (
                  <TableRow key={index} className="bg-white hover:bg-gradient-to-r hover:from-[rgba(153,69,255,0.02)] hover:to-[rgba(20,241,149,0.02)] transition-colors">
                    <TableCell className="font-medium text-gray-700">{endpoint.endpoint}</TableCell>
                    <TableCell className="font-medium text-gray-700">{endpoint.method}</TableCell>
                    <TableCell className="text-right font-medium text-gray-700">{endpoint.call_count.toLocaleString()}</TableCell>
                    <TableCell className="font-medium text-gray-700">
                      {new Date(endpoint.last_used_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium text-gray-700">{endpoint.total_cost.toLocaleString()}</TableCell>
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