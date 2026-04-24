import Image from 'next/image';

export default function Logo({ className }: { className?: string }) {
  return (
    <Image
      src='/SD_logo_v1.jpg'
      alt='logo'
      width={30}
      height={30}
      priority
      className={ className }
    />
  );
}
