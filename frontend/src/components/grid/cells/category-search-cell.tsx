'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ICellEditorParams } from 'ag-grid-community';
import type { Category } from '@/lib/api/types';
import { categoriesApi } from '@/lib/api/endpoints';
import { cn } from '@/lib/utils';

export interface CategorySearchCellParams extends ICellEditorParams {
  categories: Category[];
  onCategoryCreated?: (category: Category) => void;
}

export const CategorySearchCellEditor = forwardRef(function CategorySearchCellEditor(
  props: CategorySearchCellParams,
  ref,
) {
  const initialName =
    typeof props.value === 'string'
      ? props.value
      : (props.data?.product?.category?.name ?? '');
  const [query, setQuery] = useState(initialName);
  const [open, setOpen] = useState(true);
  const [categories, setCategories] = useState<Category[]>(props.categories ?? []);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    getValue: () => selectedNameRef.current,
    isCancelBeforeStart: () => false,
  }));

  const selectedNameRef = useRef(initialName);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, query]);

  const exactMatch = categories.some(
    (c) => c.name.toLowerCase() === query.trim().toLowerCase(),
  );
  const showCreate = query.trim().length > 0 && !exactMatch && !creating;

  const selectCategory = (category: Category) => {
    selectedNameRef.current = category.name;
    if (props.data?.product) {
      props.data.product.categoryId = category.id;
      props.data.product.category = category;
    }
    props.stopEditing();
  };

  const createCategory = async () => {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    try {
      const { data: created } = await categoriesApi.create(name);
      setCategories((prev) => [...prev, created]);
      props.onCategoryCreated?.(created);
      selectCategory(created);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="w-full min-w-[200px] border border-primary bg-background shadow-md"
      onKeyDown={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        className="w-full border-b border-border px-2 py-1.5 text-sm outline-none"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && showCreate) {
            e.preventDefault();
            void createCategory();
          } else if (e.key === 'Enter' && filtered[0]) {
            e.preventDefault();
            selectCategory(filtered[0]!);
          } else if (e.key === 'Escape') {
            props.stopEditing(true);
          }
        }}
        placeholder="Search category..."
      />
      {open && (
        <ul className="max-h-48 overflow-y-auto py-1 text-sm">
          {filtered.map((cat) => (
            <li key={cat.id}>
              <button
                type="button"
                className="w-full px-2 py-1.5 text-left hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectCategory(cat)}
              >
                {cat.name}
              </button>
            </li>
          ))}
          {showCreate && (
            <li>
              <button
                type="button"
                className={cn(
                  'w-full px-2 py-1.5 text-left font-medium text-primary hover:bg-muted',
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void createCategory()}
              >
                Create &quot;{query.trim()}&quot;
              </button>
            </li>
          )}
          {filtered.length === 0 && !showCreate && (
            <li className="px-2 py-1.5 text-muted-foreground">No categories</li>
          )}
        </ul>
      )}
    </div>
  );
});
