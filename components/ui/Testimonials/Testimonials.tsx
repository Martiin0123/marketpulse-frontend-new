import { Star, Quote } from 'lucide-react';

export default function Testimonials() {
  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Day Trader',
      location: 'San Francisco, CA',
      avatar: 'SC',
      rating: 5,
      text: "PrimeScope completely transformed my trading strategy. The AI signals are incredibly accurate, and I've seen a 340% increase in my portfolio since I started using it 6 months ago.",
      highlight: '340% portfolio increase'
    },
    {
      name: 'Michael Rodriguez',
      role: 'Investment Manager',
      location: 'New York, NY',
      avatar: 'MR',
      rating: 5,
      text: 'The real-time notifications have saved me from so many bad trades. The risk management features are top-notch, and the mobile app keeps me connected to the markets 24/7.',
      highlight: 'Avoided major losses'
    },
    {
      name: 'Alex Thompson',
      role: 'Crypto Trader',
      location: 'London, UK',
      avatar: 'AT',
      rating: 5,
      text: "I was skeptical at first, but PrimeScope's crypto signals are unmatched. The platform helped me navigate the volatile crypto market and achieve consistent profits.",
      highlight: 'Consistent crypto profits'
    },
    {
      name: 'Emma Wilson',
      role: 'Swing Trader',
      location: 'Toronto, CA',
      avatar: 'EW',
      rating: 5,
      text: 'The technical analysis tools are phenomenal. I love how the platform adapts to my trading style and provides personalized insights that actually work.',
      highlight: 'Personalized insights'
    },
    {
      name: 'David Kim',
      role: 'Portfolio Manager',
      location: 'Seoul, KR',
      avatar: 'DK',
      rating: 5,
      text: 'Managing multiple portfolios is so much easier with PrimeScope. The AI-powered risk assessment has helped me optimize returns while minimizing downside risk.',
      highlight: 'Optimized risk/return'
    },
    {
      name: 'Lisa Johnson',
      role: 'Part-time Trader',
      location: 'Sydney, AU',
      avatar: 'LJ',
      rating: 5,
      text: "As someone who can only trade part-time, the 24/7 monitoring is a game-changer. I never miss opportunities, even when I'm at my day job.",
      highlight: 'Never miss opportunities'
    }
  ];

  return (
    <section className="py-20 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            What Our
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500">
              {' '}
              Traders Say
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Join thousands of successful traders who trust PrimeScope for their
            trading decisions
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 hover:border-blue-500/50 transition-all duration-300"
            >
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mr-4">
                  <span className="text-blue-500 font-semibold text-lg">
                    {testimonial.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h4 className="text-white font-semibold">
                    {testimonial.name}
                  </h4>
                  <p className="text-slate-400 text-sm">{testimonial.role}</p>
                </div>
              </div>
              <p className="text-slate-300 leading-relaxed mb-4">
                "{testimonial.text}"
              </p>
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-5 h-5 ${i < testimonial.rating ? 'text-emerald-500' : 'text-slate-600'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
