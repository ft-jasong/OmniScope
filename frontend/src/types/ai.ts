export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  description: string;
}

export interface APIConnection {
  id: string;
  name: string;
  category: string;
  description: string;
  isSelected: boolean;
}

export interface AIConfiguration {
  selectedModel: LLMModel | null;
  selectedAPIs: APIConnection[];
  apiName: string;
  apiKey: string;
} 