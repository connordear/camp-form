"use client";

import { useEffect } from "react";

export function AutoPrint() {
  useEffect(() => {
    window.print();
  }, []);

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-950">
      <div className="text-center p-8 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 max-w-sm">
        <p className="text-lg font-medium text-gray-900 dark:text-white">
          Click Print or press Ctrl+P
        </p>
      </div>
    </div>
  );
}
