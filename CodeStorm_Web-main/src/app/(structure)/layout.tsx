export default function Layout({ children }: { children: React.ReactNode }) {
  return (
   <main
  className='overflow-auto rounded-3xl bg-zinc-900 text-zinc-100 p-10'
  style={{
    height: 'calc(100dvh - 1.25rem)'
  }}
>
  {children}
</main>
  );
}
