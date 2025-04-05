'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const models = [
  { id: 'gpt-4', name: 'GPT-4' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5' },
  { id: 'claude-3', name: 'Claude 3' },
];

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(models[0].id);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // TODO: Implement actual API call to your backend
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          model: selectedModel,
        }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-800 flex flex-col">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 border border-gray-600'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Form - Fixed to bottom */}
      <div className="shrink-0 p-4 border-t border-gray-700 bg-gray-800">
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[180px] bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id} className="text-white hover:bg-gray-600">
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="icon"
            variant="default"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
