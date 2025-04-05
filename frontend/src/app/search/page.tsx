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
      <div className="min-h-screen bg-gray-800 p-6 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Search and Filter Section */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search APIs by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px] bg-gray-700 text-white border-gray-600">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectGroup>
                  <SelectLabel className="text-gray-400">Categories</SelectLabel>
                  <SelectItem value="all" className="text-white hover:bg-gray-600">All Categories</SelectItem>
                  {Object.entries(categories).map(([key, value]) => (
                    <SelectItem key={key} value={key} className="text-white hover:bg-gray-600">
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
              className="bg-gray-700 rounded-lg p-6 hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    {getCategoryIcon(api.category)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{api.summary}</h3>
                    <p className="text-sm text-gray-400">{api.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Method</div>
                  <div className="text-white font-medium">{api.method}</div>
                </div>
              </div>
              <p className="mt-4 text-gray-300">
                {api.description.split('Returns:').map((part, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <br />}
                    {index === 0 ? part : `Returns:${part}`}
                  </React.Fragment>
                ))}
              </p>
              <div className="mt-4">
                <div className="text-sm text-gray-400">
                  Path: <span className="text-white">{api.path}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results Message */}
        {filteredAPIs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No APIs found matching your search criteria</p>
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