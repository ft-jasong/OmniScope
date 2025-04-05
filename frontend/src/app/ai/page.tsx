'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, X, Plus, Copy } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LLMModel, APIConnection, AIConfiguration } from '@/types/ai';
import apiService, { APICatalogItem } from "@/lib/api-service";

// Mock data for models - replace with actual API calls
const availableModels: LLMModel[] = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', description: 'Most capable model for complex tasks' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', description: 'Fast and efficient for most tasks' },
  { id: 'claude-3', name: 'Claude 3', provider: 'Anthropic', description: 'Advanced reasoning and analysis' },
];

// Initial mock data for user endpoints
const initialUserEndpoints = [
  {
    id: '1',
    name: 'Crypto Market Analyzer',
    model: 'GPT-4',
    endpoint: 'https://api.omniscope.ai/v1/endpoints/crypto-analyzer',
    description: 'Analyzes crypto market trends using BTC prices, kimchi premium, and funding rates',
    lastUsed: '2024-04-05T10:30:00Z',
    apis: ['Get BTC price in USD', 'Get kimchi premium percentage', 'Get current funding rates']
  },
  {
    id: '2',
    name: 'Social Media Tracker',
    model: 'Claude 3',
    endpoint: 'https://api.omniscope.ai/v1/endpoints/social-tracker',
    description: 'Tracks and analyzes social media trends from Trump and Musk',
    lastUsed: '2024-04-04T15:45:00Z',
    apis: ['Get Donald Trump\'s latest posts', 'Get Elon Musk\'s latest posts', 'Get current trending topics on X']
  },
];

export default function AIPage() {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<AIConfiguration>({
    selectedModel: null,
    selectedAPIs: [],
    apiName: '',
    apiKey: '',
  });
  const [availableAPIs, setAvailableAPIs] = useState<APIConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [userEndpoints, setUserEndpoints] = useState(initialUserEndpoints);

  // Load saved endpoints from localStorage on component mount
  useEffect(() => {
    const savedEndpoints = localStorage.getItem('userEndpoints');
    if (savedEndpoints) {
      setUserEndpoints(JSON.parse(savedEndpoints));
    }
  }, []);

  useEffect(() => {
    const fetchAPIs = async () => {
      try {
        const response = await apiService.listAPICatalog();
        const apis = response.apis.map((api: APICatalogItem) => ({
          id: api.path,
          name: api.summary,
          category: api.category,
          description: api.description,
          isSelected: false
        }));
        setAvailableAPIs(apis);
      } catch (error) {
        console.error('Error fetching APIs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAPIs();
  }, []);

  const handleModelSelect = (modelId: string) => {
    const model = availableModels.find(m => m.id === modelId);
    if (model) {
      setConfig(prev => ({ ...prev, selectedModel: model }));
    }
  };

  const handleAPINameChange = (value: string) => {
    setConfig(prev => ({ ...prev, apiName: value }));
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    // Create new endpoint from configuration
    const newEndpoint = {
      id: Date.now().toString(),
      name: config.apiName,
      model: config.selectedModel?.name || '',
      endpoint: `https://api.omniscope.ai/v1/endpoints/${config.apiName.toLowerCase().replace(/\s+/g, '-')}`,
      description: `AI agent using ${config.selectedModel?.name} with ${config.selectedAPIs.length} APIs`,
      lastUsed: new Date().toISOString(),
      apis: config.selectedAPIs.map(api => api.name)
    };

    // Add new endpoint to list and save to localStorage
    const updatedEndpoints = [...userEndpoints, newEndpoint];
    setUserEndpoints(updatedEndpoints);
    localStorage.setItem('userEndpoints', JSON.stringify(updatedEndpoints));

    // Reset form
    setConfig({
      selectedModel: null,
      selectedAPIs: [],
      apiName: '',
      apiKey: '',
    });
    setStep(1);
  };

  const handleCopyEndpoint = () => {
    let apiUrl = '';
    switch (config.selectedModel?.id) {
      case 'gpt-4':
      case 'gpt-3.5-turbo':
        apiUrl = 'https://api.openai.com/v1/chat/completions';
        break;
      case 'claude-3':
        apiUrl = 'https://api.anthropic.com/v1/messages';
        break;
      default:
        apiUrl = '';
    }
    navigator.clipboard.writeText(apiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white/80 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#9945FF] via-[#00D1FF] to-[#14F195] text-transparent bg-clip-text">
            Build your own AI agent with OmniScope APIs
          </h1>
          <div className="flex-1 h-1 bg-gradient-to-r from-[#9945FF] via-[#00D1FF] to-[#14F195] rounded-full" />
        </div>

        {/* Step Indicator */}
        <div className="flex justify-between mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                s === step ? 'bg-[#9945FF] text-white' : 
                s < step ? 'bg-[#14F195] text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-16 h-1 mx-2 ${
                  s < step ? 'bg-[#14F195]' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Model Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <Card className="bg-white border-[rgba(0,0,0,0.08)]">
              <CardHeader>
                <CardTitle className="text-gray-700">Your Existing Endpoints</CardTitle>
                <CardDescription className="text-gray-500">Manage your current AI endpoints</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {userEndpoints.map((endpoint) => (
                  <div
                    key={endpoint.id}
                    className="p-4 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white hover:border-[#9945FF] transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-700">{endpoint.name}</h3>
                        <p className="text-sm text-gray-500">{endpoint.description}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="text-xs bg-[rgba(153,69,255,0.1)] text-[#9945FF] px-2 py-1 rounded">
                            {endpoint.model}
                          </span>
                          {endpoint.apis.map((api, index) => (
                            <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {api}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-gray-500 mt-2 block">
                          Last used: {new Date(endpoint.lastUsed).toLocaleDateString()}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#9945FF] hover:text-[#8A3EE8]"
                        onClick={() => navigator.clipboard.writeText(endpoint.endpoint)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Endpoint
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-white border-[rgba(0,0,0,0.08)]">
              <CardHeader>
                <CardTitle className="text-gray-700">Create New Endpoint</CardTitle>
                <CardDescription className="text-gray-500">Choose the language model you want to use</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={config.selectedModel?.id} onValueChange={handleModelSelect}>
                  <SelectTrigger className="w-full bg-white border-[rgba(0,0,0,0.08)] text-gray-700">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[rgba(0,0,0,0.08)]">
                    {availableModels.map((model) => (
                      <SelectItem key={model.id} value={model.id} className="text-gray-700">
                        <div className="flex flex-col">
                          <span className="font-medium">{model.name}</span>
                          <span className="text-sm text-gray-500">{model.provider}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: API Selection */}
        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Available APIs */}
            <Card className="bg-white border-[rgba(0,0,0,0.08)]">
              <CardHeader>
                <CardTitle className="text-gray-700">Available APIs</CardTitle>
                <CardDescription className="text-gray-500">Select APIs to add to your configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9945FF]"></div>
                  </div>
                ) : (
                  availableAPIs
                    .filter(api => !config.selectedAPIs.some(selected => selected.id === api.id))
                    .map((api) => (
                      <div
                        key={api.id}
                        className="p-4 rounded-lg border border-[rgba(0,0,0,0.08)] bg-white hover:border-[#9945FF] transition-all cursor-pointer"
                        onClick={() => {
                          setConfig(prev => ({
                            ...prev,
                            selectedAPIs: [...prev.selectedAPIs, { ...api, isSelected: true }]
                          }));
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-700">{api.name}</h3>
                            <p className="text-sm text-gray-500">{api.description}</p>
                          </div>
                          <Plus className="w-5 h-5 text-[#9945FF]" />
                        </div>
                      </div>
                    ))
                )}
              </CardContent>
            </Card>

            {/* Selected APIs */}
            <Card className="bg-white border-[rgba(0,0,0,0.08)]">
              <CardHeader>
                <CardTitle className="text-gray-700">Selected APIs</CardTitle>
                <CardDescription className="text-gray-500">
                  {config.selectedAPIs.length} API{config.selectedAPIs.length !== 1 ? 's' : ''} selected
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {config.selectedAPIs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No APIs selected yet
                  </div>
                ) : (
                  config.selectedAPIs.map((api) => (
                    <div
                      key={api.id}
                      className="p-4 rounded-lg border border-[#9945FF] bg-[rgba(153,69,255,0.05)]"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-700">{api.name}</h3>
                          <p className="text-sm text-gray-500">{api.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-500 hover:text-red-500 hover:bg-red-50"
                          onClick={() => {
                            setConfig(prev => ({
                              ...prev,
                              selectedAPIs: prev.selectedAPIs.filter(a => a.id !== api.id)
                            }));
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: API Name */}
        {step === 3 && (
          <Card className="bg-white border-[rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="text-gray-700">Name Your API</CardTitle>
              <CardDescription className="text-gray-500">Give your API a descriptive name</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiName" className="text-gray-700">API Name</Label>
                  <Input
                    id="apiName"
                    value={config.apiName}
                    onChange={(e) => handleAPINameChange(e.target.value)}
                    placeholder="Enter a name for your API"
                    className="bg-white border-[rgba(0,0,0,0.08)] text-gray-700"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Step 4: LLM API URL */}
        {step === 4 && (
          <Card className="bg-white border-[rgba(0,0,0,0.08)]">
            <CardHeader>
              <CardTitle className="text-gray-700">LLM API URL</CardTitle>
              <CardDescription className="text-gray-500">Use this URL to connect to your selected LLM</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-[rgba(153,69,255,0.05)] border border-[#9945FF]">
                  <div className="flex items-center justify-between">
                    <code className="text-sm text-gray-700 break-all">
                      {config.selectedModel?.id === 'gpt-4' || config.selectedModel?.id === 'gpt-3.5-turbo' 
                        ? 'https://api.openai.com/v1/chat/completions'
                        : 'https://api.anthropic.com/v1/messages'}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-[#9945FF] hover:text-[#8A3EE8]"
                      onClick={handleCopyEndpoint}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  <p>Use this URL to make requests to your selected LLM ({config.selectedModel?.name}).</p>
                  <p className="mt-2">Remember to include your API key in the request headers.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
            className="border-[rgba(0,0,0,0.08)] text-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {step < 4 ? (
            <Button
              onClick={handleNext}
              disabled={
                (step === 1 && !config.selectedModel) ||
                (step === 2 && config.selectedAPIs.length === 0) ||
                (step === 3 && !config.apiName)
              }
              className="bg-[#9945FF] hover:bg-[#8A3EE8] text-white"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="bg-[#9945FF] hover:bg-[#8A3EE8] text-white"
            >
              Complete Setup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
