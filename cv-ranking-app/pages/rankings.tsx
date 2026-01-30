import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  FiBarChart2, 
  FiSearch, 
  FiArrowLeft,
  FiRefreshCw,
  FiCalendar,
  FiBriefcase,
  FiUsers,
  FiTrendingUp,
  FiEye,
  FiTrash2,
  FiAlertCircle,
  FiTarget
} from 'react-icons/fi';

interface Ranking {
  id: string;
  job_role: string;
  required_skills: string;
  ranked_candidates: any[];
  candidate_count: number;
  created_at: string;
}

export default function Rankings() {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [total, setTotal] = useState(0);

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      const response = await fetch(`/api/get-rankings?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch rankings');
      }

      const data = await response.json();
      setRankings(data.rankings || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching rankings');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchRankings();
    }, 300); // Debounce search by 300ms

    return () => clearTimeout(timeoutId);
  }, [fetchRankings]);

  const handleDelete = async (rankingId: string) => {
    if (!confirm('Are you sure you want to delete this ranking?')) {
      return;
    }

    try {
      const response = await fetch('/api/delete-ranking', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ranking_id: rankingId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete ranking');
      }

      // Refresh the list
      fetchRankings();
    } catch (err: any) {
      setError(err.message || 'Failed to delete ranking');
    }
  };

  const viewRanking = (rankingId: string) => {
    // Store ranking ID in sessionStorage and redirect to home
    sessionStorage.setItem('loadRankingId', rankingId);
    window.location.href = '/';
  };

  return (
    <>
      <Head>
        <title>Rankings History - CV Ranking System</title>
        <meta name="description" content="View all past rankings" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <div className="mb-8 animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="p-2 glass rounded-lg hover:bg-white/5 transition-colors"
                >
                  <FiArrowLeft className="w-5 h-5 text-gray-300" />
                </Link>
                <div>
                  <h1 className="text-5xl md:text-6xl font-extrabold mb-2 gradient-text">
                    Rankings History
                  </h1>
                  <p className="text-gray-400">
                    View and reuse all past ranking results
                  </p>
                </div>
              </div>
              <button
                onClick={fetchRankings}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 glass rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                <FiRefreshCw className={`w-5 h-5 text-gray-300 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-gray-300">Refresh</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="glass-strong rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-lg border border-indigo-500/30">
                  <FiSearch className="w-5 h-5 text-indigo-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by job role or skills..."
                  className="flex-1 px-4 py-2 glass rounded-lg border border-white/10 text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all duration-300"
                />
                <div className="text-sm text-gray-400">
                  {total} ranking{total !== 1 ? 's' : ''} found
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 glass p-4 rounded-xl border border-red-500/50 bg-red-500/10 animate-fade-in">
              <div className="flex items-center gap-2 text-red-300">
                <FiAlertCircle className="w-5 h-5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-16 animate-fade-in">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-gray-400">Loading rankings...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && rankings.length === 0 && (
            <div className="text-center py-16 animate-fade-in">
              <div className="flex justify-center mb-4 opacity-50">
                <div className="p-6 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 rounded-full border border-indigo-500/20">
                  <FiBarChart2 className="w-16 h-16 text-indigo-400" />
                </div>
              </div>
              <p className="text-gray-400 text-lg font-medium mb-2">No rankings found</p>
              <p className="text-sm text-gray-500 mb-6">
                {searchTerm ? 'Try a different search term' : 'Create rankings to see them here'}
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105"
              >
                <FiTarget className="w-5 h-5" />
                Create Ranking
              </Link>
            </div>
          )}

          {/* Rankings List */}
          {!loading && rankings.length > 0 && (
            <div className="space-y-4">
              {rankings.map((ranking, index) => (
                <div
                  key={ranking.id}
                  className="glass-strong rounded-xl p-6 border border-white/10 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-lg border border-indigo-500/30">
                          <FiBriefcase className="w-5 h-5 text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white">
                          {ranking.job_role || 'Untitled Ranking'}
                        </h3>
                      </div>
                      {ranking.required_skills && (
                        <p className="text-sm text-gray-400 ml-11">
                          Skills: {ranking.required_skills}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => viewRanking(ranking.id)}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-105 flex items-center gap-2"
                      >
                        <FiEye className="w-4 h-4" />
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(ranking.id)}
                        className="px-3 py-2 glass rounded-lg hover:bg-red-500/20 transition-colors text-red-400 hover:text-red-300"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="glass p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <FiUsers className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-gray-400">Candidates</span>
                      </div>
                      <div className="text-lg font-bold text-white">
                        {ranking.candidate_count || ranking.ranked_candidates?.length || 0}
                      </div>
                    </div>
                    <div className="glass p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <FiTrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-gray-400">Top Score</span>
                      </div>
                      <div className="text-lg font-bold text-white">
                        {ranking.ranked_candidates?.[0]?.total_score?.toFixed(1) || 'N/A'}
                      </div>
                    </div>
                    <div className="glass p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <FiCalendar className="w-4 h-4 text-purple-400" />
                        <span className="text-xs text-gray-400">Date</span>
                      </div>
                      <div className="text-sm font-medium text-white">
                        {new Date(ranking.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Top 3 Candidates Preview */}
                  {ranking.ranked_candidates && ranking.ranked_candidates.length > 0 && (
                    <div className="pt-4 border-t border-white/10">
                      <p className="text-xs text-gray-400 mb-2">Top Candidates:</p>
                      <div className="flex flex-wrap gap-2">
                        {ranking.ranked_candidates.slice(0, 3).map((candidate: any, idx: number) => (
                          <div
                            key={idx}
                            className="px-3 py-1 glass rounded-lg text-xs text-gray-300"
                          >
                            #{idx + 1} {candidate.candidate_name || 'Unknown'} ({candidate.total_score?.toFixed(1)})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
