import { LineChart, Users, Database, Coins } from 'lucide-react';

export interface BaseAPI {
  id: string;
  name: string;
  description: string;
  category: string;
  usage: number;
  price: number;
  icon: React.ReactNode;
}

export interface HotAPI extends BaseAPI {
  trend: number; // Percentage increase in usage
}

export const allAPIs: BaseAPI[] = [
  {
    id: "1",
    name: "BTC Price Feed",
    description: "Real-time Bitcoin price data with historical trends",
    category: "Market Data",
    usage: 150000,
    price: 0.1,
    icon: <LineChart className="w-5 h-5" />,
  },
  {
    id: "2",
    name: "Social Sentiment Analysis",
    description: "AI-powered sentiment analysis for crypto-related social media",
    category: "Social Signals",
    usage: 85000,
    price: 0.2,
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: "3",
    name: "HSK Network Analytics",
    description: "Comprehensive network statistics and transaction analysis",
    category: "On-chain Analytics",
    usage: 120000,
    price: 0.15,
    icon: <Database className="w-5 h-5" />,
  },
  {
    id: "4",
    name: "Exchange Flow Analysis",
    description: "Real-time exchange inflow/outflow tracking",
    category: "Market Data",
    usage: 95000,
    price: 0.12,
    icon: <Coins className="w-5 h-5" />,
  },
  {
    id: "5",
    name: "Cathie Wood's Market Analysis",
    description: "ARK Invest's market analysis and investment signals",
    category: "Market Data",
    usage: 110000,
    price: 0.18,
    icon: <LineChart className="w-5 h-5" />,
  },
  {
    id: "6",
    name: "Social Media Impact",
    description: "Track social media influence on crypto prices",
    category: "Social Signals",
    usage: 65000,
    price: 0.25,
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: "7",
    name: "DeFi Protocol Analytics",
    description: "Real-time DeFi protocol performance and risk metrics",
    category: "On-chain Analytics",
    usage: 75000,
    price: 0.15,
    icon: <Database className="w-5 h-5" />,
  },
  {
    id: "8",
    name: "NFT Market Trends",
    description: "NFT market analysis and collection performance tracking",
    category: "Market Data",
    usage: 55000,
    price: 0.2,
    icon: <LineChart className="w-5 h-5" />,
  },
  {
    id: "9",
    name: "Whale Wallet Tracking",
    description: "Monitor large wallet movements and their market impact",
    category: "On-chain Analytics",
    usage: 45000,
    price: 0.25,
    icon: <Database className="w-5 h-5" />,
  },
  {
    id: "10",
    name: "Cross-Exchange Arbitrage",
    description: "Real-time arbitrage opportunities across exchanges",
    category: "Market Data",
    usage: 35000,
    price: 0.3,
    icon: <Coins className="w-5 h-5" />,
  },
  {
    id: "11",
    name: "Mining Difficulty Analysis",
    description: "Bitcoin mining difficulty and profitability metrics",
    category: "On-chain Analytics",
    usage: 25000,
    price: 0.15,
    icon: <Database className="w-5 h-5" />,
  },
  {
    id: "12",
    name: "Layer 2 Analytics",
    description: "Performance metrics for Layer 2 scaling solutions",
    category: "On-chain Analytics",
    usage: 20000,
    price: 0.2,
    icon: <Database className="w-5 h-5" />,
  }
];

export const hotAPIs: HotAPI[] = allAPIs.map(api => ({
  ...api,
  trend: Math.floor(Math.random() * 30) + 10 // Random trend between 10-40%
}));

export const trendingSearches = [
  "BTC Price Feed",
  "Trump Social Sentiment",
  "HSK Network Activity",
  "Elon Musk Impact",
  "Exchange Flow Analysis",
  "HSK Price Feed",
  "Cathie Wood's Signals"
]; 