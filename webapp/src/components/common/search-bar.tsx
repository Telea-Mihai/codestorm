import { Search } from 'lucide-react';

export default function SearchBar() {
  return (
    <div className="flex w-80 items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/70 px-4 py-2 text-zinc-200 backdrop-blur-md transition-all focus-within:border-zinc-500 focus-within:bg-zinc-800">
      
      <Search size={18} className="text-zinc-400" />

      <input
        placeholder="Search..."
        className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-500 outline-none"
      />
    </div>
  );
}