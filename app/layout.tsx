import { Metadata } from 'next';
import Footer from '@/components/ui/Footer';
import Navbar from '@/components/ui/Navbar';
import { Toaster } from '@/components/ui/Toasts/toaster';
import { PropsWithChildren, Suspense } from 'react';
import { getURL } from '@/utils/helpers';
import 'styles/main.css';

import { SpeedInsights } from '@vercel/speed-insights/react';
import { createClient } from '@/utils/supabase/server';
import { getUser, getSubscription } from '@/utils/supabase/queries';
import { AuthProvider } from '@/utils/auth-context';
import AmplitudeProvider from '@/components/ui/Analytics/AmplitudeProvider';
import ClientWrapper from '@/components/ui/CookieConsent/ClientWrapper';
import LoadingProvider from '@/components/ui/Loading/LoadingProvider';

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
        url: `${getURL()}/share.png`,
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
    images: [`${getURL()}/share.png`]
  }
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const supabase = createClient();
  const user = await getUser(supabase);
  const subscription = user ? await getSubscription(supabase) : null;

  return (
    <html lang="en">
      <head>
        {/* Google tag (gtag.js) */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=AW-17361459473"
        ></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-17361459473');
            `
          }}
        />
        {/* Trustpilot Domain Verification */}
        <meta
          name="trustpilot-one-time-domain-verification-id"
          content="e4ffd8c6-503e-47e2-a79e-7a113962fb10"
        />
      </head>
      <body className="bg-slate-900 text-white">
        <AuthProvider
          initialUser={user}
          initialSubscription={subscription as any}
        >
          <AmplitudeProvider>
            <LoadingProvider>
              <ClientWrapper>
                <Navbar />
                <main
                  id="skip"
                  className="min-h-[calc(100dvh-4rem)] md:min-h-[calc(100dvh-5rem)] pt-24"
                >
                  {children}
                </main>
                <Footer user={user} subscription={subscription as any} />
                <Suspense>
                  <Toaster />
                </Suspense>
                <SpeedInsights />
              </ClientWrapper>
            </LoadingProvider>
          </AmplitudeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
