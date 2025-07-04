import Image from 'next/image';

export default function Logo() {
  return (
    <Image
      src="/primescope-full.png"
      alt="PrimeScope Logo"
      width={82}
      height={82}
      className="rounded-lg"
    />
  );
}
