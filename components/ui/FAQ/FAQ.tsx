'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'How accurate are your trading signals?',
      answer:
        'Our AI-powered signals have achieved a 95% accuracy rate over the past 12 months. We use advanced machine learning algorithms that analyze 50+ market indicators in real-time to identify high-probability trading opportunities.'
    },
    {
      question: 'What markets do you cover?',
      answer:
        'We currently provide signals for cryptocurrency markets (Bybit), with plans to expand to forex and stocks. Our signals work on major pairs and popular cryptocurrencies with high liquidity.'
    },
    {
      question: 'How quickly do I receive signals?',
      answer:
        "Signals are delivered instantly via email, SMS, and Discord notifications. You'll receive alerts within seconds of our AI detecting a profitable opportunity, ensuring you never miss a winning trade."
    },
    {
      question: 'What is your money-back guarantee?',
      answer:
        "We offer a Monthly No Loss Guarantee. If our signals result in a net loss for any month, you'll receive a full refund for that billing cycle. No questions asked."
    },
    {
      question: 'Do I need trading experience?',
      answer:
        'No prior trading experience is required. Our signals provide clear entry and exit points with recommended position sizing. However, we recommend starting with small amounts and gradually increasing as you become comfortable.'
    },
    {
      question: 'How much capital do I need to start?',
      answer:
        "You can start with any amount you're comfortable with. We recommend starting with at least $100 to see meaningful results, but the choice is yours. Our position sizing recommendations are percentage-based."
    },
    {
      question: 'Can I cancel my subscription anytime?',
      answer:
        'Yes, you can cancel your subscription at any time with no penalties or hidden fees. Your access will continue until the end of your current billing period.'
    },
    {
      question: 'What support do you provide?',
      answer:
        'We provide 24/7 support through our Discord community, email support, and comprehensive documentation. Our team of trading experts is always available to help you succeed.'
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-slate-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-purple-500/10 backdrop-blur-sm rounded-full border border-purple-500/30 mb-6">
            <HelpCircle className="w-4 h-4 text-purple-500 mr-2" />
            <span className="text-purple-200 text-sm font-medium">
              Frequently Asked Questions
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Got
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-cyan-500 to-emerald-500">
              {' '}
              Questions?
            </span>
          </h2>

          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Everything you need to know about our AI-powered trading signals.
            Can't find the answer you're looking for? Contact our support team.
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden hover:border-purple-500/50 transition-all duration-300"
            >
              <button
                className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-slate-700/20 transition-colors duration-200"
                onClick={() => toggleFAQ(index)}
              >
                <h3 className="text-lg font-semibold text-white pr-4">
                  {faq.question}
                </h3>
                <div className="flex-shrink-0">
                  {openIndex === index ? (
                    <ChevronUp className="w-5 h-5 text-purple-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>

              {openIndex === index && (
                <div className="px-8 pb-6">
                  <div className="text-slate-300 leading-relaxed">
                    {faq.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="text-center mt-12">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8">
            <h3 className="text-2xl font-bold text-white mb-4">
              Still have questions?
            </h3>
            <p className="text-slate-400 mb-6">
              Our support team is here to help you get started and succeed with
              our trading signals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://discord.gg/GDY4ZcXzes"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white rounded-lg font-semibold transition-all duration-300"
              >
                Join Discord Community
              </a>
              <a
                href="mailto:support@marketpulse.com"
                className="inline-flex items-center px-6 py-3 bg-transparent border-2 border-slate-600 hover:border-slate-500 text-white rounded-lg font-semibold transition-all duration-300"
              >
                Email Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
