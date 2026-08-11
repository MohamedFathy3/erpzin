// ========== Pagination Component ==========
const PaginationControls = () => {
  const totalPages = returnsResponse?.meta?.last_page || 1;
  const currentPage = returnsResponse?.meta?.current_page || 1;
  const total = returnsResponse?.meta?.total || 0;
  const perPage = returnsResponse?.meta?.per_page || 10;

  if (totalPages <= 1) return null;

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      refetch();
    }
  };

  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 border-t">
      <div className="text-sm text-muted-foreground">
        {language === 'ar' 
          ? `عرض ${startItem} - ${endItem} من ${total} مرتجع`
          : `Showing ${startItem} - ${endItem} of ${total} returns`
        }
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-8 w-8 p-0"
        >
          {isRTL ? '→' : '←'}
        </Button>
        
        {/* أرقام الصفحات */}
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (currentPage <= 3) {
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = currentPage - 2 + i;
          }

          return (
            <Button
              key={pageNum}
              variant={pageNum === currentPage ? 'default' : 'outline'}
              size="sm"
              onClick={() => goToPage(pageNum)}
              className="h-8 w-8 p-0"
            >
              {pageNum}
            </Button>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="h-8 w-8 p-0"
        >
          {isRTL ? '←' : '→'}
        </Button>
      </div>
    </div>
  );
};