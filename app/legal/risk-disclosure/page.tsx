export default function RiskDisclosure() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">Risk Disclosure Statement</h1>

      <div className="bg-red-900/50 border-l-4 border-red-500 p-4 mb-8">
        <p className="text-lg font-bold text-red-100">
          IMPORTANT: This is a Simulated Trading Environment
        </p>
        <p className="text-red-200">
          All trading activities on this platform are simulated. No real money
          is involved, and no actual trades are executed on any real market.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          1. Nature of Simulated Trading
        </h2>
        <p className="mb-4">
          PrimeScope provides a simulated trading environment designed for
          educational and entertainment purposes only. While we strive to create
          realistic market conditions, there are significant differences between
          simulated and real trading, including:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>No real money is at risk</li>
          <li>Simulated trades may not reflect real market liquidity</li>
          <li>Execution speeds and prices may differ from real markets</li>
          <li>
            Emotional factors present in real trading may not be replicated
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">2. Educational Purpose</h2>
        <p className="mb-4">This platform is designed to:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Help users understand basic trading mechanics</li>
          <li>Practice trading strategies without financial risk</li>
          <li>Learn about market behavior and analysis</li>
          <li>Experiment with different trading approaches</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">3. No Investment Advice</h2>
        <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-6 mb-4">
          <p className="font-bold mb-4 text-yellow-800">
            IMPORTANT DISCLAIMERS:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-yellow-800">
            <li>We do NOT provide investment advice or recommendations</li>
            <li>Our trading signals are for educational purposes ONLY</li>
            <li>
              Success in simulated trading does NOT guarantee success in real
              trading
            </li>
            <li>
              This platform should NOT be used as the basis for any investment
              decisions
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">4. Real Trading Risks</h2>
        <p className="mb-4">
          If you are considering real trading, be aware that:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>
            Trading real financial instruments involves substantial risk of loss
          </li>
          <li>You should never trade with money you cannot afford to lose</li>
          <li>Past performance does not indicate future results</li>
          <li>
            Real trading requires extensive knowledge, experience, and risk
            management
          </li>
          <li>Market conditions can change rapidly and unpredictably</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          5. AI-Generated Signals Disclaimer
        </h2>
        <div className="bg-blue-100 border border-blue-300 rounded-lg p-6 mb-4">
          <p className="mb-4 text-blue-800 font-semibold">
            Our AI-generated trading signals:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-blue-800">
            <li>Are experimental and for educational purposes only</li>
            <li>May not reflect real market conditions</li>
            <li>Should not be relied upon for real investment decisions</li>
            <li>Are not guaranteed to be accurate or profitable</li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          6. No Loss Guarantee and Refund Policy
        </h2>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-4">
          <p className="font-bold mb-4 text-emerald-800">REFUND POLICY:</p>
          <div className="space-y-3 text-emerald-700">
            <p>
              You are eligible for a full refund of your subscription fee for
              any month in which PrimeScope's published signal results show a
              net loss.
            </p>
            <p>
              Refunds are based solely on the performance displayed on our
              platform, not on individual user trading results.
            </p>
            <p>
              PrimeScope is not responsible for users' personal trading activity
              or outcomes.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">7. Acknowledgment</h2>
        <p className="mb-4">
          By using this platform, you acknowledge and agree that:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>You understand this is a simulated environment only</li>
          <li>No real trading takes place on this platform</li>
          <li>
            You will not make real investment decisions based solely on this
            platform
          </li>
          <li>
            You understand the differences between simulated and real trading
          </li>
        </ul>
      </section>

      <div className="mt-8 pt-8 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
