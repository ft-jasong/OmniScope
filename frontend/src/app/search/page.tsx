'use client';

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, LineChart, Users, Database, Coins } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import apiService, { APICatalogItem, APICategoriesResponse } from "@/lib/api-service";

const ITEMS_PER_PAGE = 6;

// Helper function to get icon based on category
const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'market data':
      return <LineChart className="w-5 h-5" />;
    case 'social signals':
      return <Users className="w-5 h-5" />;
    case 'on-chain analytics':
      return <Database className="w-5 h-5" />;
    default:
      return <Coins className="w-5 h-5" />;
  }
};

export default function SearchPage() {
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [apis, setApis] = React.useState<APICatalogItem[]>([]);
  const [categories, setCategories] = React.useState<APICategoriesResponse>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [catalogResponse, categoriesResponse] = await Promise.all([
          apiService.listAPICatalog(selectedCategory === "all" ? undefined : selectedCategory),
          apiService.listAPICategories()
        ]);
        setApis(catalogResponse.apis);
        setCategories(categoriesResponse);
      } catch (error) {
        console.error('Error fetching API data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCategory]);

  const filteredAPIs = apis.filter(api => {
    const matchesSearch = api.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         api.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredAPIs.length / ITEMS_PER_PAGE);
  const paginatedAPIs = filteredAPIs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white/80 p-6 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white/80 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Search and Filter Section */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 z-50 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search APIs by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white border-[rgba(0,0,0,0.08)] text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-[#9945FF] focus:border-transparent"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px] bg-white text-gray-700 border-[rgba(0,0,0,0.08)] focus:ring-2 focus:ring-[#9945FF] focus:border-transparent">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[rgba(0,0,0,0.08)]">
                <SelectGroup>
                  <SelectLabel className="text-gray-500">Categories</SelectLabel>
                  <SelectItem value="all" className="text-gray-700 hover:bg-[rgba(153,69,255,0.05)]">All Categories</SelectItem>
                  {Object.entries(categories).map(([key, value]) => (
                    <SelectItem key={key} value={key} className="text-gray-700 hover:bg-[rgba(153,69,255,0.05)]">
                      {value}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {paginatedAPIs.map((api) => (
            <div
              key={api.path}
              className="bg-gradient-to-br from-[rgba(255,255,255,0.9)] to-[rgba(255,255,255,0.7)] backdrop-blur-xl border border-[rgba(0,0,0,0.08)] rounded-lg p-6 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-[rgba(153,69,255,0.1)] to-[rgba(20,241,149,0.1)] rounded-lg text-[#9945FF]">
                    {getCategoryIcon(api.category)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700">{api.summary}</h3>
                    <p className="text-sm text-gray-500">{api.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Method</div>
                  <div className="text-gray-700 font-medium">{api.method}</div>
                </div>
              </div>
              <p className="mt-4 text-gray-600">
                {api.description.split('Returns:').map((part, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <br />}
                    {index === 0 ? part : `Returns:${part}`}
                  </React.Fragment>
                ))}
              </p>
              <div className="mt-4">
                <div className="text-sm text-gray-500">
                  Path: <span className="text-gray-700">{api.path}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results Message */}
        {filteredAPIs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No APIs found matching your search criteria</p>
          </div>
        )}

        {/* Pagination */}
        {filteredAPIs.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
} 