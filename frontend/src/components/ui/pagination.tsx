import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-center space-x-2 mt-8">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="bg-white border-[rgba(0,0,0,0.08)] text-gray-700 hover:bg-[rgba(153,69,255,0.05)] disabled:opacity-50 disabled:hover:bg-white"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center space-x-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
            className={`${
              currentPage === page
                ? "bg-[#9945FF] text-white hover:bg-[#8A3EE8]"
                : "bg-white border-[rgba(0,0,0,0.08)] text-gray-700 hover:bg-[rgba(153,69,255,0.05)]"
            }`}
          >
            {page}
          </Button>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="bg-white border-[rgba(0,0,0,0.08)] text-gray-700 hover:bg-[rgba(153,69,255,0.05)] disabled:opacity-50 disabled:hover:bg-white"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
} 