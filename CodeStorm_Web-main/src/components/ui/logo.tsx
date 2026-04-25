import Image from 'next/image';

export default function Logo({ className }: { className?: string }) {
  return (
    <Image
      src='/logo.png'
      alt='logo'
      width={30}
      height={30}
      priority
      className={className}
    />
  );
}
