import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { FiClock, FiUsers, FiAward, FiTrash2, FiChevronRight, FiSearch, FiStar, FiTrendingUp } from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';

interface RankingEntry {
  _id: string;
  jobTitle: string;
  skills: string[];
  weights: Record<string, number>;
  candidatesCount: number;
  rankedCandidates: Array<{
    name: string;
    score: number;
    skills?: string[];
  }>;
  bestCandidate: {
    name: string;
    score: number;
  } | null;
  jobId: string | null;
  createdAt: string;
}

export default function RankingHistoryPage() {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/ranking-history');
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t('history.deleteConfirm'))) return;

    try {
      await fetch(`/api/ranking-history?id=${id}`, { method: 'DELETE' });
      fetchHistory();
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400 bg-green-500/20';
    if (score >= 60) return 'text-blue-400 bg-blue-500/20';
    if (score >= 40) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-gray-400 bg-gray-500/20';
  };

  return (
    <>
      <Head>
        <title>{t('history.title')} - Smart Hire</title>
      </Head>

      <div className="min-h-screen pt-24 pb-12 px-4">
        <div className="aurora-bg"></div>

        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{t('history.title')}</h1>
            <p className="text-gray-400">{t('history.viewPastSessions')}</p>
          </div>

          {/* History List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : entries.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-gray-800 flex items-center justify-center mb-4">
                <FiClock className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{t('history.noHistory')}</h3>
              <p className="text-gray-400 mb-6">{t('history.startRankingDesc')}</p>
              <Link 
                href="/command-center"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all"
              >
                <FiTrendingUp /> {t('history.startRankingCVs')}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <div 
                  key={entry._id}
                  className="glass-card rounded-2xl overflow-hidden"
                >
                  {/* Main Row */}
                  <div 
                    className="p-6 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedEntry(expandedEntry === entry._id ? null : entry._id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FiSearch className="w-5 h-5 text-blue-400" />
                          <h3 className="text-lg font-semibold text-white">
                            {entry.jobTitle}
                          </h3>
                        </div>

                        {/* Skills */}
                        {entry.skills && entry.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {entry.skills.slice(0, 6).map((skill, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded"
                              >
                                {skill}
                              </span>
                            ))}
                            {entry.skills.length > 6 && (
                              <span className="px-2 py-0.5 text-xs bg-gray-700/50 text-gray-400 rounded">
                                +{entry.skills.length - 6} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* Stats Row */}
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <FiUsers className="w-4 h-4" />
                            {entry.candidatesCount} {t('history.candidatesCount')}
                          </span>
                          {entry.bestCandidate && entry.bestCandidate.name && (
                            <span className="flex items-center gap-1 text-yellow-400">
                              <FiAward className="w-4 h-4" />
                              {t('history.best')} <span className="font-semibold">{entry.bestCandidate.name}</span>
                              <span className="text-gray-500">({Math.round(entry.bestCandidate.score)}%)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 ml-4">
                        <span className="text-xs text-gray-500">{formatDate(entry.createdAt)}</span>
                        <button
                          onClick={(e) => handleDelete(entry._id, e)}
                          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                        <FiChevronRight 
                          className={`w-5 h-5 text-gray-500 transition-transform ${
                            expandedEntry === entry._id ? 'rotate-90' : ''
                          }`} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedEntry === entry._id && (
                    <div className="px-6 pb-6 border-t border-white/5 pt-4 animate-fade-in">
                      {/* Top Candidates */}
                      {entry.rankedCandidates && entry.rankedCandidates.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-400 mb-3">{t('history.topCandidates')}</h4>
                          <div className="space-y-2">
                            {entry.rankedCandidates.slice(0, 5).map((candidate, i) => (
                              <div 
                                key={i}
                                className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                              >
                                <div className="flex items-center gap-3">
                                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                    i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                    i === 1 ? 'bg-gray-400/20 text-gray-300' :
                                    i === 2 ? 'bg-orange-500/20 text-orange-400' :
                                    'bg-gray-700/50 text-gray-500'
                                  }`}>
                                    #{i + 1}
                                  </span>
                                  <div>
                                    <span className="text-white font-medium">
                                      {candidate.name || t('common.unknownCandidate')}
                                    </span>
                                    {candidate.skills && candidate.skills.length > 0 && (
                                      <div className="flex gap-1 mt-1">
                                        {candidate.skills.slice(0, 3).map((skill, si) => (
                                          <span key={si} className="px-1.5 py-0.5 text-xs bg-green-500/10 text-green-400 rounded">
                                            {skill}
                                          </span>
                                        ))}
                                        {candidate.skills.length > 3 && (
                                          <span className="text-xs text-gray-500">+{candidate.skills.length - 3}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <span className={`px-3 py-1 rounded-lg text-sm font-mono font-bold ${getScoreColor(candidate.score)}`}>
                                  {typeof candidate.score === 'number' ? candidate.score.toFixed(0) : candidate.score}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Weights Used */}
                      {entry.weights && Object.keys(entry.weights).length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-400 mb-3">{t('history.scoringWeightsUsed')}</h4>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(entry.weights).map(([key, value]) => (
                              <span 
                                key={key}
                                className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-sm"
                              >
                                {key}: {value}%
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Link to Job if exists */}
                      {entry.jobId && (
                        <div className="mt-4 pt-4 border-t border-white/5">
                          <Link 
                            href={`/jobs/${entry.jobId}`}
                            className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                          >
                            {t('history.viewOriginalJobPosting')} <FiChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
