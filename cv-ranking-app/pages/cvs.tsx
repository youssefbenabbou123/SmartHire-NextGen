import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  FiDatabase, 
  FiUser, 
  FiSearch, 
  FiDownload,
  FiTrash2,
  FiRefreshCw,
  FiFileText,
  FiCalendar,
  FiBriefcase,
  FiCode,
  FiBox,
  FiAlertCircle,
  FiEye,
  FiStar
} from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';

interface SavedCV {
  candidate_name: string;
  personal_info?: any;
  experience?: any[];
  projects?: any[];
  skills?: any;
  education?: any[];
  parsed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export default function CVs() {
  const { t } = useLanguage();
  const [cvs, setCvs] = useState<SavedCV[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [total, setTotal] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Load favorites from localStorage after component mounts (client-side only)
  useEffect(() => {
    setIsClient(true);
    const savedFavorites = localStorage.getItem('cvFavorites');
    if (savedFavorites) {
      try {
        setFavorites(new Set(JSON.parse(savedFavorites)));
      } catch (e) {
        console.error('Failed to load favorites:', e);
      }
    }
  }, []);

  // Save favorites to localStorage whenever it changes (only after initial load)
  useEffect(() => {
    if (isClient && favorites.size > 0) {
      localStorage.setItem('cvFavorites', JSON.stringify(Array.from(favorites)));
    } else if (isClient) {
      // Also save when favorites becomes empty (to clear localStorage)
      localStorage.setItem('cvFavorites', JSON.stringify([]));
    }
  }, [favorites, isClient]);

  const fetchCVs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      const response = await fetch(`/api/get-cvs?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch CVs');
      }

      const data = await response.json();
      setCvs(data.cvs || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching CVs');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCVs();
    }, 300); // Debounce search by 300ms

    return () => clearTimeout(timeoutId);
  }, [fetchCVs]);

  const handleDelete = async (candidateName: string) => {
    if (!confirm(`${t('cvs.deleteConfirm')} ${candidateName}'s ${t('cvs.candidateCV')}`)) {
      return;
    }

    try {
      const response = await fetch('/api/delete-cv', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ candidate_name: candidateName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete CV');
      }

      // Refresh the list
      fetchCVs();
    } catch (err: any) {
      setError(err.message || 'Failed to delete CV');
    }
  };

  const toggleFavorite = (candidateName: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(candidateName)) {
        next.delete(candidateName);
        // Show toast notification
        const toast = document.createElement('div');
        toast.className = 'fixed top-20 right-6 glass-panel rounded-xl px-4 py-3 shadow-2xl z-50 animate-fade-in-up';
        toast.innerHTML = `
          <div class="flex items-center gap-2 text-yellow-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span class="text-white">Removed from favorites</span>
          </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(-10px)';
          setTimeout(() => toast.remove(), 300);
        }, 2000);
      } else {
        next.add(candidateName);
        // Show toast notification
        const toast = document.createElement('div');
        toast.className = 'fixed top-20 right-6 glass-panel rounded-xl px-4 py-3 shadow-2xl z-50 animate-fade-in-up';
        toast.innerHTML = `
          <div class="flex items-center gap-2 text-yellow-400">
            <svg class="w-5 h-5 fill-current" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span class="text-white">Added to favorites</span>
          </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(-10px)';
          setTimeout(() => toast.remove(), 300);
        }, 2000);
      }
      return next;
    });
  };

  const downloadCV = (cv: SavedCV) => {
    // Remove MongoDB metadata fields, keep only the CV data
    const { candidate_name, parsed_at, created_at, updated_at, raw_data, ...cvData } = cv;
    
    // If raw_data exists, use it (for backwards compatibility), otherwise use the structured data
    const dataToDownload = raw_data || cvData;
    
    const dataStr = JSON.stringify(dataToDownload, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cv.candidate_name || 'cv'}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Head>
        <title>{t('cvs.title')} - CV Ranking System</title>
        <meta name="description" content={t('cvs.subtitle')} />
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
              <div>
                <h1 className="text-5xl md:text-6xl font-extrabold mb-2 gradient-text">
                  {t('cvs.title')}
                </h1>
                <p className="text-gray-400">
                  {t('cvs.subtitle')}
                </p>
              </div>
              <button
                onClick={fetchCVs}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 glass rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                <FiRefreshCw className={`w-5 h-5 text-gray-300 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-gray-300">{t('cvs.refresh')}</span>
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
                  placeholder={t('cvs.searchPlaceholder')}
                  className="flex-1 px-4 py-2 glass rounded-lg border border-white/10 text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all duration-300"
                />
                <button
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                    showFavoritesOnly
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'glass text-gray-300 hover:bg-white/5 border border-white/10'
                  }`}
                  title={showFavoritesOnly ? t('cvs.showAllCVs') : t('cvs.showFavoritesOnly')}
                >
                  <FiStar className={`w-5 h-5 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                  <span className="text-sm font-medium">{isClient ? favorites.size : 0}</span>
                </button>
                <div className="text-sm text-gray-400">
                  {total} CV{total !== 1 ? 's' : ''} {t('cvs.found')}
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
              <p className="text-gray-400">{t('common.loadingCVs')}</p>
            </div>
          )}

          {/* CVs List */}
          {!loading && (cvs.length === 0 || (showFavoritesOnly && cvs.filter(cv => favorites.has(cv.candidate_name)).length === 0)) && (
            <div className="text-center py-16 animate-fade-in">
              <div className="flex justify-center mb-4 opacity-50">
                <div className="p-6 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 rounded-full border border-indigo-500/20">
                  <FiDatabase className="w-16 h-16 text-indigo-400" />
                </div>
              </div>
              <p className="text-gray-400 text-lg font-medium mb-2">
                {showFavoritesOnly ? t('cvs.noFavorites') : t('cvs.noCVs')}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                {showFavoritesOnly 
                  ? t('cvs.noFavoritesDesc')
                  : searchTerm ? t('cvs.noCVsSearch') : t('cvs.noCVsDesc')
                }
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105"
              >
                <FiFileText className="w-5 h-5" />
                {t('cvs.uploadCVs')}
              </Link>
            </div>
          )}

          {/* CVs Grid */}
          {!loading && cvs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cvs
                .filter(cv => !showFavoritesOnly || favorites.has(cv.candidate_name))
                .map((cv, index) => (
                <div
                  key={index}
                  className="glass-strong rounded-xl p-6 border border-white/10 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:scale-105 animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-lg border border-indigo-500/30">
                        <FiUser className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white">
                          {cv.candidate_name || t('common.unknownCandidate')}
                        </h3>
                        {cv.personal_info?.location && (
                          <p className="text-xs text-gray-400">{cv.personal_info.location}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleFavorite(cv.candidate_name)}
                      className={`p-2 rounded-lg transition-all shrink-0 ${
                        favorites.has(cv.candidate_name)
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-white/5 text-gray-400 hover:bg-yellow-500/10 hover:text-yellow-400'
                      }`}
                      title={favorites.has(cv.candidate_name) ? t('cvs.removeFromFavorites') : t('cvs.addToFavorites')}
                    >
                      <FiStar className={`w-5 h-5 ${favorites.has(cv.candidate_name) ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="glass p-2 rounded-lg text-center">
                      <div className="flex justify-center mb-1">
                        <FiBriefcase className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="text-sm font-bold text-white">
                        {cv.experience?.length || 0}
                      </div>
                      <div className="text-xs text-gray-400">{t('cvs.experience')}</div>
                    </div>
                    <div className="glass p-2 rounded-lg text-center">
                      <div className="flex justify-center mb-1">
                        <FiBox className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="text-sm font-bold text-white">
                        {cv.projects?.length || 0}
                      </div>
                      <div className="text-xs text-gray-400">{t('cvs.projects')}</div>
                    </div>
                    <div className="glass p-2 rounded-lg text-center">
                      <div className="flex justify-center mb-1">
                        <FiCode className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="text-sm font-bold text-white">
                        {cv.skills?.programming_languages?.length || 0}
                      </div>
                      <div className="text-xs text-gray-400">{t('cvs.skills')}</div>
                    </div>
                  </div>

                  {/* Timestamp */}
                  {cv.parsed_at && (
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                      <FiCalendar className="w-3 h-3" />
                      <span>{t('cvs.parsed')}: {new Date(cv.parsed_at).toLocaleDateString()}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                    <Link
                      href={`/candidate/${encodeURIComponent(cv.candidate_name)}`}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg transition-all text-sm text-white font-medium hover:scale-105"
                    >
                      <FiEye className="w-4 h-4" />
                      {t('cvs.viewProfile')}
                    </Link>
                    <button
                      onClick={() => downloadCV(cv)}
                      className="px-3 py-2 glass rounded-lg hover:bg-white/5 transition-colors text-sm text-gray-300 hover:text-white"
                      title={t('cvs.download')}
                    >
                      <FiDownload className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cv.candidate_name)}
                      className="px-3 py-2 glass rounded-lg hover:bg-red-500/20 transition-colors text-sm text-red-400 hover:text-red-300"
                      title={t('cvs.delete')}
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
