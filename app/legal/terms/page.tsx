export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
        <p className="mb-4">
          These Terms of Service govern your use of PrimeScope (the "Service"),
          a simulated trading platform operated by Martin Zangerl ("we", "us",
          or "our"). By accessing or using the Service, you agree to be bound by
          these terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-red-500">
          2. Important Risk Disclosure
        </h2>
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 mb-4">
          <p className="font-bold mb-4 text-red-100">
            SIMULATED TRADING ENVIRONMENT - NOT REAL TRADING
          </p>
          <ul className="list-disc pl-6 space-y-2 text-red-200">
            <li>
              This is a SIMULATED trading platform. No real money is involved,
              and no real trades are executed.
            </li>
            <li>
              Performance results in this simulation do NOT reflect actual
              trading and have NO bearing on potential real-world trading
              results.
            </li>
            <li>
              Trading signals and recommendations are for educational and
              entertainment purposes ONLY.
            </li>
            <li>
              Past performance in our simulation does NOT guarantee future
              results in real trading.
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">3. Service Description</h2>
        <p className="mb-4">
          PrimeScope provides a simulated trading environment where users can:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Practice trading strategies without financial risk</li>
          <li>Receive AI-generated trading signals for educational purposes</li>
          <li>Track simulated portfolio performance</li>
          <li>Learn about trading mechanics and market behavior</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          4. Disclaimer of Warranties
        </h2>
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 mb-4">
          <p className="mb-4 text-gray-800 font-semibold">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
            WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED. WE SPECIFICALLY
            DISCLAIM:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-800">
            <li>
              Any implied warranties of merchantability, fitness for a
              particular purpose, or non-infringement
            </li>
            <li>
              Any responsibility for the accuracy, reliability, or quality of
              trading signals
            </li>
            <li>
              Any liability for losses or damages resulting from reliance on the
              information provided
            </li>
            <li>Any guarantee of trading success, whether simulated or real</li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          5. Limitation of Liability
        </h2>
        <p className="mb-4">
          IN NO EVENT SHALL WE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS
          OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING
          FROM YOUR USE OR INABILITY TO USE THE SERVICE.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">6. User Obligations</h2>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>You must be at least 18 years old to use the Service</li>
          <li>You must provide accurate registration information</li>
          <li>
            You are responsible for maintaining the security of your account
          </li>
          <li>You agree not to abuse or exploit the Service</li>
          <li>You understand this is a simulated environment only</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          7. Modifications to Service
        </h2>
        <p className="mb-4">
          We reserve the right to modify or discontinue the Service at any time
          without notice. We shall not be liable to you or any third party for
          any modification, suspension, or discontinuance of the Service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">8. Governing Law</h2>
        <p className="mb-4">
          These Terms shall be governed by and construed in accordance with the
          laws of Austria, without regard to its conflict of law provisions.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">9. Contact Information</h2>
        <p className="mb-4">
          For any questions about these Terms, please contact:
          <br />
          Martin Zangerl
          <br />
          Email: zangerl.martin@hotmail.com
        </p>
      </section>

      <div className="mt-8 pt-8 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
