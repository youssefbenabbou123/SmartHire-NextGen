import Head from 'next/head';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FiArrowRight,
  FiMessageSquare,
  FiSearch,
  FiAward,
  FiSettings,
  FiTrendingUp,
  FiUsers,
  FiBarChart2,
  FiChevronRight
} from 'react-icons/fi';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCVs: 0,
    totalRankings: 0,
    averageScore: 0.0,
  });

  useEffect(() => {
    // Load CV stats
    const storedRankings = localStorage.getItem('cvRankings');
    if (storedRankings) {
      try {
        const rankings = JSON.parse(storedRankings);
        const scores = rankings.map((r: any) => r.total_score);
        setStats({
          totalCVs: rankings.length,
          totalRankings: rankings.length,
          averageScore: scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0,
        });
      } catch (e) {
        console.error('Error loading stats:', e);
      }
    }
  }, []);

  const quickActions = [
    {
      title: 'AI Recruiter',
      description: 'Ask questions and find candidates using natural language',
      icon: FiMessageSquare,
      href: '/recruiter',
      color: 'from-indigo-600 to-purple-600',
      badge: 'New'
    },
    {
      title: 'Search CVs',
      description: 'Browse and filter candidates by skills, experience, and more',
      icon: FiSearch,
      href: '/search',
      color: 'from-blue-600 to-cyan-600',
    },
    {
      title: 'Rank Candidates',
      description: 'Evaluate and compare candidates for a specific position',
      icon: FiAward,
      href: '/rank',
      color: 'from-green-600 to-emerald-600',
    },
    {
      title: 'Methodology',
      description: 'Configure scoring parameters and ranking criteria',
      icon: FiSettings,
      href: '/methodology',
      color: 'from-orange-600 to-red-600',
    },
  ];

  return (
    <>
      <Head>
        <title>Capgemini AI Recruitment Platform</title>
        <meta name="description" content="Enterprise AI-powered recruitment system for Capgemini" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        {/* Header */}
        <div className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Capgemini
                </div>
                <div className="text-sm text-gray-400">AI Recruitment Platform</div>
              </div>
              <div className="text-xs bg-indigo-600/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/50">
                Beta
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-6 py-16 space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-5xl md:text-6xl font-extrabold">
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Intelligent Recruitment
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              AI-powered CV analysis and candidate ranking for Capgemini's recruitment process
            </p>
            <p className="text-sm text-gray-400 max-w-2xl mx-auto">
              Find the perfect candidates using advanced filtering, natural language queries, and explainable scoring models
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total CVs</p>
                  <p className="text-4xl font-bold mt-2">{stats.totalCVs}</p>
                </div>
                <FiUsers className="w-10 h-10 text-indigo-400 opacity-20" />
              </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Rankings</p>
                  <p className="text-4xl font-bold mt-2">{stats.totalRankings}</p>
                </div>
                <FiBarChart2 className="w-10 h-10 text-purple-400 opacity-20" />
              </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Average Score</p>
                  <p className="text-4xl font-bold mt-2">{stats.averageScore.toFixed(1)}</p>
                </div>
                <FiTrendingUp className="w-10 h-10 text-green-400 opacity-20" />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Recruitment Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href}>
                    <div className={`bg-gradient-to-br ${action.color} rounded-xl p-8 hover:shadow-2xl transition-all cursor-pointer group border border-white/10 hover:border-white/20 transform hover:scale-105`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                          {action.title === 'AI Recruiter' ? (
                            <FiMessageSquare className="w-6 h-6 text-white" />
                          ) : (
                            <Icon className="w-6 h-6 text-white" />
                          )}
                        </div>
                        {action.badge && (
                          <div className="text-xs bg-white/20 text-white px-2 py-1 rounded-full font-semibold">
                            {action.badge}
                          </div>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{action.title}</h3>
                      <p className="text-white/80 text-sm mb-4">{action.description}</p>
                      <div className="flex items-center gap-2 text-white/60 group-hover:text-white transition-colors">
                        <span className="text-sm font-medium">Get Started</span>
                        <FiChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Features */}
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6">Platform Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="p-2 bg-indigo-600/20 rounded-lg h-fit">
                  <FiMessageSquare className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">AI Recruiter Chatbot</h3>
                  <p className="text-sm text-gray-400">Ask natural language questions like "Show me Java experts" or "Find candidates with 5+ years experience"</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="p-2 bg-purple-600/20 rounded-lg h-fit">
                  <FiSearch className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Advanced Search</h3>
                  <p className="text-sm text-gray-400">Filter by skills, experience level, company tier, education, and more</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="p-2 bg-green-600/20 rounded-lg h-fit">
                  <FiAward className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Intelligent Ranking</h3>
                  <p className="text-sm text-gray-400">Score candidates based on job requirements with explainable methodology</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="p-2 bg-orange-600/20 rounded-lg h-fit">
                  <FiSettings className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Customizable Criteria</h3>
                  <p className="text-sm text-gray-400">Configure scoring weights and parameters to match Capgemini's specific needs</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 text-center space-y-4">
            <h2 className="text-2xl font-bold">Ready to find your next top talent?</h2>
            <p className="text-indigo-200">Start using the AI Recruiter to search for candidates matching your criteria</p>
            <Link href="/recruiter">
              <button className="mt-4 px-8 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-2 mx-auto">
                Launch AI Recruiter
                <FiArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
