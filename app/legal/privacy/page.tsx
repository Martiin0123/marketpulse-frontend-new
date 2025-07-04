export default function Privacy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">1. Data Controller</h2>
        <p className="mb-4">
          Martin Zangerl
          <br />
          Dorfstraße 22
          <br />
          6561 Ischgl
          <br />
          Austria
          <br />
          Email: zangerl.martin@hotmail.com
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          2. Overview of Processing
        </h2>
        <p className="mb-4">
          This privacy notice provides you with an overview of how we process
          your personal data and your rights under data protection law. The
          specific data that is processed and how it is used depends largely on
          the services requested or agreed upon.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          3. Types of Data Processed
        </h2>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Account data (e.g., usernames, passwords)</li>
          <li>Contact information (e.g., email)</li>
          <li>Usage data (e.g., websites visited, interest in content)</li>
          <li>
            Meta/communication data (e.g., device information, IP addresses)
          </li>
          <li>Simulated trading data and performance metrics</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">4. Purpose of Processing</h2>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Providing our simulated trading platform and its features</li>
          <li>User account management</li>
          <li>Security measures</li>
          <li>Analytics and service optimization</li>
          <li>Communication regarding service updates or support</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">5. Legal Basis</h2>
        <p className="mb-4">
          We process your data based on the following legal grounds:
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Consent (Art. 6(1)(a) GDPR)</li>
          <li>Contract fulfillment (Art. 6(1)(b) GDPR)</li>
          <li>Legal obligation (Art. 6(1)(c) GDPR)</li>
          <li>Legitimate interests (Art. 6(1)(f) GDPR)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">6. Data Recipients</h2>
        <p className="mb-4">
          Within our service, your data is only accessed by persons who need
          this for our contractual and legal obligations. Some data is shared
          with our processors (e.g., hosting providers) who are contractually
          bound to handle your data confidentially.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">7. Data Storage Duration</h2>
        <p className="mb-4">
          We store your data for as long as needed to provide our services and
          comply with legal obligations. Simulated trading data is stored for
          the duration of your account plus any legally required retention
          periods.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">8. Your Rights</h2>
        <p className="mb-4">You have the following rights:</p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Right to access your personal data</li>
          <li>Right to rectification of incorrect data</li>
          <li>Right to erasure ("right to be forgotten")</li>
          <li>Right to restriction of processing</li>
          <li>Right to data portability</li>
          <li>Right to object to processing</li>
          <li>Right to withdraw consent</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">9. Cookies and Analytics</h2>
        <p className="mb-4">
          Our website uses essential cookies necessary for its basic
          functionality. We also use analytics tools to improve our service. You
          can control cookie settings through your browser.
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
