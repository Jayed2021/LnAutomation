import { useState, useMemo } from 'react';
import { Search, CheckSquare, Square } from 'lucide-react';

interface Location {
  id: string;
  code: string;
  name: string;
  warehouse_name: string;
}

interface LocationSearchGridProps {
  locations: Location[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function LocationSearchGrid({ locations, selected, onChange }: LocationSearchGridProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return locations;
    return locations.filter(
      l =>
        l.code.toLowerCase().includes(q) ||
        l.name.toLowerCase().includes(q) ||
        l.warehouse_name.toLowerCase().includes(q)
    );
  }, [locations, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every(l => selected.includes(l.id));

  const toggleAll = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filtered.map(l => l.id));
      onChange(selected.filter(id => !filteredIds.has(id)));
    } else {
      const newIds = filtered.map(l => l.id).filter(id => !selected.includes(id));
      onChange([...selected, ...newIds]);
    }
  };

  const toggle = (id: string, checked: boolean) => {
    onChange(checked ? [...selected, id] : selected.filter(x => x !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code, name, or warehouse..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          {allFilteredSelected ? (
            <CheckSquare className="w-4 h-4 text-blue-500" />
          ) : (
            <Square className="w-4 h-4 text-gray-400" />
          )}
          {allFilteredSelected ? 'Deselect visible' : 'Select all visible'}
        </button>
      </div>

      {search && (
        <p className="text-xs text-gray-500">
          {filtered.length} of {locations.length} locations shown
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="py-8 text-center text-gray-400 text-sm">No locations match your search</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-1">
          {filtered.map(loc => (
            <label
              key={loc.id}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                selected.includes(loc.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(loc.id)}
                onChange={e => toggle(loc.id, e.target.checked)}
                className="rounded"
              />
              <div className="min-w-0">
                <p className="font-mono font-semibold text-sm text-gray-900 truncate">{loc.code}</p>
                <p className="text-xs text-gray-500 truncate">{loc.name}</p>
              </div>
            </label>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <p className="text-xs text-blue-600 font-medium">
          {selected.length} location{selected.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
