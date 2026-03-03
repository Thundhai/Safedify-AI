import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, AlertTriangle, Eye, FileText, Shield, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiSearch } from '../services/apiService';

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  incident: <AlertTriangle size={16} className="text-red-500" />,
  observation: <Eye size={16} className="text-blue-500" />,
  action: <ClipboardList size={16} className="text-green-500" />,
  permit: <Shield size={16} className="text-yellow-500" />,
  document: <FileText size={16} className="text-purple-500" />,
};

const ENTITY_ROUTES: Record<string, string> = {
  incident: '/incidents',
  observation: '/observations',
  action: '/actions',
  permit: '/permits',
  document: '/documents',
};

interface SearchResult {
  id: string;
  type: string;
  title: string;
  snippet: string;
  date: string;
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await apiSearch(q);
      setResults(data.results || []);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard shortcut: Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSelect = (r: SearchResult) => {
    const route = ENTITY_ROUTES[r.type];
    if (route) navigate(`${route}/${r.id}`);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
      >
        <Search size={16} />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs bg-white border rounded shadow-sm">⌘K</kbd>
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-2xl border z-50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <Search size={18} className="text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search incidents, observations, permits…"
              className="flex-1 outline-none text-sm"
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults([]); }}>
                <X size={16} className="text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && <p className="px-4 py-3 text-sm text-gray-400">Searching…</p>}
            {!loading && query.length >= 2 && results.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-400">No results found</p>
            )}
            {results.map(r => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => handleSelect(r)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition border-b last:border-0"
              >
                <span className="mt-0.5">{ENTITY_ICONS[r.type] || <FileText size={16} />}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                  <p className="text-xs text-gray-500 truncate">{r.snippet}</p>
                </div>
                <span className="text-xs text-gray-400 capitalize whitespace-nowrap">{r.type}</span>
              </button>
            ))}
          </div>

          {!loading && query.length < 2 && (
            <p className="px-4 py-3 text-xs text-gray-400">Type at least 2 characters to search</p>
          )}
        </div>
      )}
    </div>
  );
}
