import { Star, Quote } from 'lucide-react';

export default function Testimonials() {
  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Day Trader',
      location: 'San Francisco, CA',
      avatar: 'SC',
      rating: 5,
      text: "MarketPulse completely transformed my trading strategy. The AI signals are incredibly accurate, and I've seen a 340% increase in my portfolio since I started using it 6 months ago.",
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
      text: "I was skeptical at first, but MarketPulse's crypto signals are unmatched. The platform helped me navigate the volatile crypto market and achieve consistent profits.",
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
      text: 'Managing multiple portfolios is so much easier with MarketPulse. The AI-powered risk assessment has helped me optimize returns while minimizing downside risk.',
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
    <section className="relative py-20 bg-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center px-4 py-2 bg-green-500/20 backdrop-blur-sm rounded-full border border-green-500/30 mb-8">
            <Star className="w-4 h-4 text-green-400 mr-2" />
            <span className="text-green-200 text-sm font-medium">
              Trusted by Traders Worldwide
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Success Stories from
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
              {' '}
              Real Traders
            </span>
          </h2>

          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Discover how MarketPulse has helped traders around the world achieve
            their financial goals
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="group relative bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-8 hover:border-purple-500/40 transition-all duration-300 hover:transform hover:scale-105"
            >
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              <div className="relative">
                {/* Quote Icon */}
                <div className="mb-6">
                  <Quote className="w-8 h-8 text-purple-400" />
                </div>

                {/* Rating */}
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>

                {/* Testimonial Text */}
                <p className="text-gray-300 mb-6 leading-relaxed">
                  "{testimonial.text}"
                </p>

                {/* Highlight */}
                <div className="inline-flex items-center px-3 py-1 bg-green-500/20 rounded-full border border-green-500/30 mb-6">
                  <span className="text-green-200 text-sm font-medium">
                    {testimonial.highlight}
                  </span>
                </div>

                {/* Author */}
                <div className="flex items-center">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold mr-4">
                    {testimonial.avatar}
                  </div>

                  {/* Author Info */}
                  <div>
                    <div className="text-white font-semibold">
                      {testimonial.name}
                    </div>
                    <div className="text-purple-200 text-sm">
                      {testimonial.role}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {testimonial.location}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Stats */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="group">
            <div className="text-4xl font-bold text-green-400 mb-2 group-hover:scale-110 transition-transform">
              4.9/5
            </div>
            <div className="text-gray-300">Average Rating</div>
            <div className="text-gray-400 text-sm">
              Based on 12,000+ reviews
            </div>
          </div>

          <div className="group">
            <div className="text-4xl font-bold text-purple-400 mb-2 group-hover:scale-110 transition-transform">
              98%
            </div>
            <div className="text-gray-300">Success Rate</div>
            <div className="text-gray-400 text-sm">
              Profitable traders using our platform
            </div>
          </div>

          <div className="group">
            <div className="text-4xl font-bold text-pink-400 mb-2 group-hover:scale-110 transition-transform">
              24/7
            </div>
            <div className="text-gray-300">Support</div>
            <div className="text-gray-400 text-sm">
              Expert assistance when you need it
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
