import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

// =====================================================================
// SearchableSelect — Dropdown com autocomplete por digitação
// =====================================================================

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  id?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecionar...',
  label,
  id,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleSelect = (opt: string) => {
    onChange(opt);
    setQuery('');
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    if (e.key === 'Enter' && filtered.length > 0) handleSelect(filtered[0]);
  }, [filtered]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label htmlFor={id} className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        id={id}
        type="button"
        onClick={() => setOpen(!open)}
        className={`
          w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium
          bg-slate-800/60 text-slate-200 transition-all duration-200 min-w-[220px]
          ${open ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-700/60 hover:border-slate-600'}
        `}
      >
        <span className={value ? 'text-slate-100' : 'text-slate-500'}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <span onClick={handleClear} className="p-0.5 hover:bg-slate-600 rounded transition-colors">
              <X className="w-3.5 h-3.5 text-slate-400" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-slate-700">
            <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2">
              <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pesquisar..."
                className="bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none flex-1 min-w-0"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-slate-500 text-sm px-4 py-3 text-center">Nenhum resultado</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`
                    w-full text-left px-4 py-2.5 text-sm transition-colors
                    ${value === opt
                      ? 'bg-blue-600/20 text-blue-300 font-semibold'
                      : 'text-slate-300 hover:bg-slate-700/60'}
                  `}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
