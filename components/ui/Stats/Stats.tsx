import { TrendingUp, Users, Target, DollarSign } from 'lucide-react';

export default function Stats() {
  const stats = [
    {
      icon: <Users className="w-8 h-8 text-blue-500" />,
      number: '50,000+',
      label: 'Active Traders',
      description: 'Trust our platform daily'
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-emerald-500" />,
      number: '94.2%',
      label: 'Signal Accuracy',
      description: 'Proven track record'
    },
    {
      icon: <DollarSign className="w-8 h-8 text-cyan-500" />,
      number: '$2.5B+',
      label: 'Trading Volume',
      description: 'Processed monthly'
    },
    {
      icon: <Target className="w-8 h-8 text-indigo-700" />,
      number: '15,000+',
      label: 'Successful Trades',
      description: 'This month alone'
    }
  ];

  return (
    <section className="py-20 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">
            Trusted by traders worldwide
          </h2>
          <p className="text-slate-400 text-lg mb-8">
            Join thousands of successful traders who trust PrimeScope for their
            trading decisions
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 text-center hover:border-blue-500/50 transition-all duration-300"
            >
              <div className="text-4xl font-bold text-white mb-2">
                {stat.number}
              </div>
              <div className="text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
