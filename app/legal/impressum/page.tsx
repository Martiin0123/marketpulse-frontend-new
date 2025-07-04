import Link from 'next/link';

export default function Impressum() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">Impressum (Legal Notice)</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          Information according to § 5 TMG
        </h2>
        <p className="mb-4">
          Martin Zangerl
          <br />
          Dorfstraße 22
          <br />
          6561 Ischgl
          <br />
          Austria
        </p>

        <h3 className="font-semibold mb-2">Contact</h3>
        <p className="mb-4">Email: zangerl.martin@hotmail.com</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Responsible for Content</h2>
        <p className="mb-4">
          Martin Zangerl
          <br />
          Dorfstraße 22
          <br />
          6561 Ischgl
          <br />
          Austria
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Disclaimer</h2>

        <h3 className="font-semibold mb-2">Liability for Content</h3>
        <p className="mb-4">
          The contents of our pages have been created with great care. However,
          we cannot guarantee the accuracy, completeness, and timeliness of the
          content. As a service provider, we are responsible for our own content
          on these pages according to general laws. However, we are not
          obligated to monitor transmitted or stored third-party information or
          to investigate circumstances that indicate illegal activity.
        </p>

        <h3 className="font-semibold mb-2">Liability for Links</h3>
        <p className="mb-4">
          Our offer contains links to external websites of third parties, on
          whose contents we have no influence. Therefore, we cannot assume any
          liability for these external contents. The respective provider or
          operator of the pages is always responsible for the contents of the
          linked pages. The linked pages were checked for possible legal
          violations at the time of linking. Illegal contents were not
          recognizable at the time of linking.
        </p>

        <h3 className="font-semibold mb-2">Copyright</h3>
        <p className="mb-4">
          The contents and works created by the site operators on these pages
          are subject to Austrian copyright law. Duplication, processing,
          distribution, or any form of commercialization of such material beyond
          the scope of the copyright law shall require the prior written consent
          of its respective author or creator.
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
