import Image from 'next/image';

export default function Logo({ className = '', width = 200, height = 200 }) {
  return (
    <Image
      src="/marketpulse.png"
      alt="MarketPulse Logo"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
