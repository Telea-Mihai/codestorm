export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="my-2 ml-2 h-[calc(100%-1rem)] overflow-x-hidden overflow-y-scroll rounded-3xl bg-zinc-900 text-zinc-100 [scrollbar-gutter:stable]">
      <div className="p-10 pr-14">{children}</div>
    </main>
  );
}
