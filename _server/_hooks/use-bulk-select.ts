    "use client";

import { useState, useCallback } from "react";

/**
 * Reusable hook for managing row selection in a table.
 * Works with any array of items that have an `id: string` field.
 */
export default function useBulkSelect<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const allSelected = items.length > 0 && items.every((i) => selectedIds.includes(i.id));
  const someSelected = items.some((i) => selectedIds.includes(i.id));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      // Deselect only the current page items (keep selections from other pages)
      setSelectedIds((prev) => prev.filter((id) => !items.find((i) => i.id === id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...items.map((i) => i.id)])]);
    }
  }, [allSelected, items]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  return {
    selectedIds,
    setSelectedIds,
    allSelected,
    someSelected,
    toggleAll,
    toggleOne,
    clearSelection,
  };
}
