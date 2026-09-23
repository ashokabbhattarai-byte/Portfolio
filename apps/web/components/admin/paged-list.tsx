'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PageResult } from '@portfolio/types';
import type { BlogSearchParams } from '@/lib/admin-api';

export function usePagedList<T>(
  key: string,
  initial: PageResult<T> | undefined,
  fetchPage: (params: BlogSearchParams) => Promise<PageResult<T>>,
  extra: BlogSearchParams = {},
  defaultSort = 'position',
) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [sort, setSort] = useState(defaultSort);
  useEffect(() => {
    const timer = setTimeout(() => {
      setTerm(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useQuery({
    queryKey: [key, 'pages', { page, limit, search: term, sort, ...extra }],
    queryFn: () =>
      fetchPage({ page, limit, search: term || undefined, sort, ...extra }),
    initialData:
      page === 1 &&
      limit === 20 &&
      !term &&
      sort === defaultSort &&
      !Object.values(extra).some(Boolean)
        ? initial
        : undefined,
    staleTime: 30_000,
  });
  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  useEffect(() => {
    if (query.data && page > pages) setPage(pages);
  }, [query.data, page, pages]);
  return {
    ...query,
    rows: query.data?.items ?? [],
    total,
    pages,
    page,
    setPage,
    limit,
    setLimit: (value: number) => {
      setLimit(value);
      setPage(1);
    },
    search,
    setSearch: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    sort,
    setSort: (value: string) => {
      setSort(value);
      setPage(1);
    },
    canReorder:
      !term &&
      !search &&
      sort === 'position' &&
      total <= limit &&
      !query.isFetching,
  };
}

type Controls = Pick<
  ReturnType<typeof usePagedList>,
  | 'page'
  | 'pages'
  | 'limit'
  | 'total'
  | 'setPage'
  | 'setLimit'
  | 'search'
  | 'setSearch'
  | 'sort'
  | 'setSort'
  | 'isFetching'
  | 'error'
  | 'refetch'
>;
export function ListControls({
  list,
  label,
  sortOptions = ['position', 'newest', 'oldest'],
  children,
}: {
  list: Controls;
  label: string;
  sortOptions?: string[];
  children?: React.ReactNode;
}) {
  return (
    <section className="adm-list-controls" aria-label={`${label} controls`}>
      <div className="adm-list-filters">
        <label>
          Search {label}
          <input
            type="search"
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
            placeholder={`Find ${label}…`}
          />
        </label>
        <label>
          Sort by
          <select
            value={list.sort}
            onChange={(e) => list.setSort(e.target.value)}
          >
            {sortOptions.map((value) => (
              <option key={value} value={value}>
                {
                  (
                    {
                      position: 'Display order',
                      newest: 'Newest first',
                      oldest: 'Oldest first',
                      updated: 'Recently updated',
                      title: 'Title A–Z',
                    } as Record<string, string>
                  )[value]
                }
              </option>
            ))}
          </select>
        </label>
        <label>
          Per page
          <select
            value={list.limit}
            onChange={(e) => list.setLimit(Number(e.target.value))}
          >
            {[20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        {children}
      </div>
      <div className="adm-list-pagination">
        <p role="status" aria-live="polite">
          {list.isFetching
            ? 'Loading…'
            : `${list.total ? (list.page - 1) * list.limit + 1 : 0}–${Math.min(list.page * list.limit, list.total)} of ${list.total} ${label}`}
        </p>
        <nav aria-label={`${label} pagination`}>
          <button
            className="adm-btn tiny"
            disabled={list.page <= 1 || list.isFetching}
            onClick={() => list.setPage(1)}
          >
            First
          </button>
          <button
            className="adm-btn tiny"
            disabled={list.page <= 1 || list.isFetching}
            onClick={() => list.setPage(list.page - 1)}
          >
            Previous
          </button>
          <span>
            Page {list.page} of {list.pages}
          </span>
          <button
            className="adm-btn tiny"
            disabled={list.page >= list.pages || list.isFetching}
            onClick={() => list.setPage(list.page + 1)}
          >
            Next
          </button>
          <button
            className="adm-btn tiny"
            disabled={list.page >= list.pages || list.isFetching}
            onClick={() => list.setPage(list.pages)}
          >
            Last
          </button>
        </nav>
      </div>
      {list.error && (
        <div role="alert" className="adm-alert">
          {list.error.message}{' '}
          <button className="adm-btn tiny" onClick={() => void list.refetch()}>
            Retry
          </button>
        </div>
      )}
    </section>
  );
}
