import { Metadata } from 'next';
import Footer from '@/components/ui/Footer';
import Navbar from '@/components/ui/Navbar';
import { Toaster } from '@/components/ui/Toasts/toaster';
import { PropsWithChildren, Suspense } from 'react';
import { getURL } from '@/utils/helpers';
import 'styles/main.css';
import { GeistSans } from 'geist/font/sans';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { createClient } from '@/utils/supabase/server';
import { getUser, getSubscription } from '@/utils/supabase/queries';

const title = 'PrimeScope - AI-Powered Trading Platform';
const description =
  'Master the markets with AI precision. Get real-time trading signals, advanced technical analysis, and market insights powered by cutting-edge AI.';

export const metadata: Metadata = {
  metadataBase: new URL(getURL()),
  title: title,
  description: description,
  openGraph: {
    title: title,
    description: description,
    url: getURL(),
    siteName: 'PrimeScope',
    images: [
      {
        url: `${getURL()}/opengraph-image.png`,
        width: 1200,
        height: 630
      }
    ],
    locale: 'en-US',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: title,
    description: description,
    images: [`${getURL()}/opengraph-image.png`]
  }
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const supabase = createClient();
  const user = await getUser(supabase);
  const subscription = user ? await getSubscription(supabase) : null;

  return (
    <html lang="en" className={GeistSans.className}>
      <body className="bg-slate-900 text-white">
        <Navbar />
        <main
          id="skip"
          className="min-h-[calc(100dvh-4rem)] md:min-h-[calc(100dvh-5rem)] pt-24"
        >
          {children}
        </main>
        <Footer user={user} subscription={subscription} />
        <Suspense>
          <Toaster />
        </Suspense>
        <SpeedInsights />
      </body>
    </html>
  );
}
