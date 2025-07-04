import Image from 'next/image';

export default function Logo() {
  return (
    <Image
      src="/primescope-full.png"
      alt="PrimeScope Logo"
      width={32}
      height={32}
      className="rounded-lg"
    />
  );
}
