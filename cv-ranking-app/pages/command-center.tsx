import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  FiTarget, 
  FiBriefcase, 
  FiUpload, 
  FiX, 
  FiZap, 
  FiAward, 
  FiBarChart2, 
  FiTrendingUp, 
  FiCheck,
  FiDatabase,
  FiSave,
  FiCpu,
  FiShield,
  FiSearch,
  FiUser,
  FiUsers,
  FiClock
} from 'react-icons/fi';

// Animated dots hook for loading states
const useAnimatedDots = (isActive: boolean) => {
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    if (!isActive) {
      setDots('');
      return;
    }
    
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '.';
        return prev + '.';
      });
    }, 400);
    
    return () => clearInterval(interval);
  }, [isActive]);
  
  return dots;
};

// Interfaces
interface Candidate {
  personal_info?: {
    full_name?: string;
  };
  experience?: any[];
  projects?: any[];
  skills?: any;
  education?: any[];
  certifications?: string[];
  [key: string]: any;
}

interface RankedCandidate {
  candidate_name: string;
  total_score: number;
  scores: {
    experience_quality: number;
    technical_skills: number;
    projects_impact: number;
    education_certifications: number;
    signal_consistency: number;
  };
  explanation: string;
  rank: number;
  detailed_explanations?: any;
  raw_data?: any;
}

export default function Home() {
  const { t } = useLanguage();
  // State
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobRole, setJobRole] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [jobField, setJobField] = useState('');
  const [rankedCandidates, setRankedCandidates] = useState<RankedCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mistralChecking, setMistralChecking] = useState(false);
  const [mistralAnalysis, setMistralAnalysis] = useState<any>(null);
  const [savingToDB, setSavingToDB] = useState<Record<number, boolean>>({});
  const [savedToDB, setSavedToDB] = useState<Record<number, boolean>>({});
  
  // Database modal state
  const [showDBModal, setShowDBModal] = useState(false);
  const [dbCVs, setDbCVs] = useState<any[]>([]);
  const [selectedCVs, setSelectedCVs] = useState<Set<string>>(new Set());
  const [dbSearchTerm, setDbSearchTerm] = useState('');
  const [loadingDB, setLoadingDB] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Animated dots for loading states
  const parsingDots = useAnimatedDots(parsing);
  const loadingDots = useAnimatedDots(loading);

  // Load Ranking Logic
  useEffect(() => {
    const loadRankingId = sessionStorage.getItem('loadRankingId');
    if (loadRankingId) {
      sessionStorage.removeItem('loadRankingId');
      loadRankingFromDB(loadRankingId);
    }
  }, []);

  const loadRankingFromDB = async (rankingId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/get-ranking?id=${rankingId}`);
      if (!response.ok) throw new Error(t('cc.failedToLoadRanking'));
      const data = await response.json();
      const ranking = data.ranking;
      
      setJobRole(ranking.job_role || '');
      setRequiredSkills(ranking.required_skills || '');
      
      const loadedCandidates = ranking.ranked_candidates.map((rc: any) => {
        const { candidate_name, total_score, scores, rank, ...candidateData } = rc;
        return candidateData;
      });
      setCandidates(loadedCandidates);
      setRankedCandidates(ranking.ranked_candidates || []);
      localStorage.setItem('cvRankings', JSON.stringify(ranking.ranked_candidates || []));
    } catch (err: any) {
      setError(err.message || t('cc.failedToLoadRanking'));
    } finally {
      setLoading(false);
    }
  };

  // Upload Logic
  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    const newCandidates: Candidate[] = [];
    setParsing(true);
    setError(null);

    for (const file of fileArray) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('/api/parse-cv', { method: 'POST', body: formData });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `${t('cc.failedToParse')} ${file.name}`);
        }

        const candidate = await response.json();
        newCandidates.push(candidate);
        saveCandidateToDB(candidate).catch(console.error);
        
      } catch (err: any) {
        setError(err.message || `${t('cc.errorProcessing')} ${file.name}`);
        setParsing(false);
        return;
      }
    }

    setCandidates((prev) => [...prev, ...newCandidates]);
    setParsing(false);
  };

  const saveCandidateToDB = async (candidate: Candidate, index?: number) => {
    const candidateIndex = index !== undefined ? index : candidates.length;
    setSavingToDB((prev) => ({ ...prev, [candidateIndex]: true }));
    try {
      await fetch('/api/save-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate, parsedAt: new Date().toISOString() }),
      });
      setSavedToDB((prev) => ({ ...prev, [candidateIndex]: true }));
    } catch (error) {
      console.error('Save error', error);
    } finally {
      setSavingToDB((prev) => {
        const u = { ...prev };
        delete u[candidateIndex];
        return u;
      });
    }
  };

  // Database modal functions
  const fetchDBCVs = async () => {
    setLoadingDB(true);
    try {
      const params = new URLSearchParams();
      if (dbSearchTerm) params.append('search', dbSearchTerm);
      const response = await fetch(`/api/get-cvs?${params.toString()}`);
      if (!response.ok) throw new Error(t('common.failedToFetch'));
      const data = await response.json();
      setDbCVs(data.cvs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingDB(false);
    }
  };

  const openDBModal = () => {
    setShowDBModal(true);
    fetchDBCVs();
  };

  const toggleSelectCV = (candidateName: string) => {
    setSelectedCVs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(candidateName)) {
        newSet.delete(candidateName);
      } else {
        newSet.add(candidateName);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedCVs.size === dbCVs.length) {
      setSelectedCVs(new Set());
    } else {
      setSelectedCVs(new Set(dbCVs.map(cv => cv.candidate_name)));
    }
  };

  const loadSelectedCVs = () => {
    const selected = dbCVs.filter(cv => selectedCVs.has(cv.candidate_name));
    setCandidates(prev => [...prev, ...selected]);
    setShowDBModal(false);
    setSelectedCVs(new Set());
  };

  const handleRank = async () => {
    if (candidates.length === 0) {
      setError(t('cc.uploadCVsFirst'));
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rank-js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidates,
          jobRequirements: {
            role: jobRole,
            required_skills: requiredSkills ? requiredSkills.split(',').map(s => s.trim()) : undefined,
            field: jobField
          }
        }),
      });

      if (!response.ok) throw new Error('Ranking failed');
      const data = await response.json();
      const ranked = data.ranked_candidates || [];
      setRankedCandidates(ranked);
      localStorage.setItem('cvRankings', JSON.stringify(ranked));

      // Auto-save ranking to old system
      fetch('/api/save-ranking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobRole,
          requiredSkills,
          rankedCandidates: ranked,
          timestamp: new Date().toISOString()
        })
      }).catch(console.error);

      // Also save to ranking history
      const searchSkills = requiredSkills ? requiredSkills.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      const searchTitle = jobRole || (searchSkills.length > 0 ? `Skills: ${searchSkills.slice(0, 3).join(', ')}${searchSkills.length > 3 ? '...' : ''}` : 'General Search');
      
      fetch('/api/ranking-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: searchTitle,
          skills: searchSkills,
          weights: {},
          candidatesCount: ranked.length,
          rankedCandidates: ranked.slice(0, 10).map((c: any) => ({
            name: c.name,
            score: c.total_score || c.score || 0,
            skills: c.skills_matched || []
          })),
          bestCandidate: ranked.length > 0 ? {
            name: ranked[0].name,
            score: ranked[0].total_score || ranked[0].score || 0
          } : null
        })
      }).catch(console.error);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMistralCheck = async () => {
    setMistralChecking(true);
    try {
      const response = await fetch('/api/mistral-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rankedCandidates,
          jobRequirements: { role: jobRole, required_skills: requiredSkills?.split(',') }
        }),
      });
      const data = await response.json();
      setMistralAnalysis(data);
    } catch (e) {
      console.error(e);
    } finally {
      setMistralChecking(false);
    }
  };

  return (
    <>
      <Head>
        <title>{t('cc.title')} - Smart Hire</title>
      </Head>

      <div className="min-h-screen pt-24 pb-12 px-6 relative">
        <div className="aurora-bg"></div>
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 animate-fade-in-up">
            <div>
              <h1 className="text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                {t('cc.title')}
              </h1>
              <p className="text-gray-400 text-lg">
                {t('cc.subtitleDesc')}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {(loading || parsing) && (
                 <div className="flex items-center gap-3 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
                   <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                   <span className="text-blue-400 font-mono text-sm">
                     {parsing ? `${t('cc.scanningDocuments')}${parsingDots}` : `${t('cc.calculatingRankings')}${loadingDots}`}
                   </span>
                 </div>
              )}
              <Link href="/ranking-history">
                <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 rounded-lg text-sm text-gray-300 hover:text-white transition-all">
                  <FiClock size={16} />
                  {t('nav.history')}
                </button>
              </Link>
            </div>
          </div>

          {/* Configuration Panel */}
          <div className="glass-panel p-6 rounded-2xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <FiTarget className="text-blue-400" /> {t('cc.targetRole')}
                </label>
                <input
                  type="text"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  placeholder={t('cc.seniorBackendEngineer')}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white placeholder-gray-600"
                />
              </div>
              <div className="flex-[2] space-y-2">
                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <FiCpu className="text-purple-400" /> {t('cc.requiredSkills')}
                </label>
                <input
                  type="text"
                  value={requiredSkills}
                  onChange={(e) => setRequiredSkills(e.target.value)}
                  placeholder={t('cc.pythonDockerKubernetes')}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-white placeholder-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Col: Upload & Candidates */}
            <div className="lg:col-span-5 space-y-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              
              {/* Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileUpload(e.dataTransfer.files);
                }}
                className={`group relative border-2 border-dashed rounded-3xl p-8 text-center transition-all duration-300 ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-500/10 scale-[1.02]' 
                    : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  accept=".pdf,.doc,.docx,.json"
                />
                
                <div className="absolute inset-0 bg-grid opacity-[0.03] pointer-events-none rounded-3xl"></div>
                
                <div className="flex flex-col items-center justify-center gap-4 relative z-10">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                     parsing ? 'bg-blue-500/20 animate-pulse' : 'bg-white/5 group-hover:bg-white/10'
                  }`}>
                    <FiUpload className={`w-8 h-8 ${parsing ? 'text-blue-400 animate-bounce' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {parsing ? (
                        <span className="flex items-center gap-1">
                          {t('cc.scanningDocumentsText')}<span className="w-6 text-left">{parsingDots}</span>
                        </span>
                      ) : t('cc.uploadResumes')}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {parsing ? t('cc.pleaseWait') : t('cc.dragDropFiles')}
                    </p>
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={parsing}
                    className={`mt-2 px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                      parsing 
                        ? 'bg-blue-500/20 text-blue-300 cursor-not-allowed' 
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {parsing ? t('cc.processing') : t('cc.selectFiles')}
                  </button>
                </div>
              </div>

              {/* Load from Database */}
              <div 
                onClick={openDBModal}
                className="glass-panel rounded-3xl p-8 text-center border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/5 transition-all cursor-pointer group"
              >
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-purple-500/10 group-hover:bg-purple-500/20 transition-all">
                    <FiDatabase className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{t('cc.loadFromDatabase')}</h3>
                    <p className="text-sm text-gray-500">{t('cc.selectCVsFromDB')}</p>
                  </div>
                </div>
              </div>

              {/* Candidate List */}
              {candidates.length > 0 && (
                <div className="glass-panel rounded-2xl p-6 min-h-[400px]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                       <FiUsers /> {t('cc.candidatesCount')} ({candidates.length})
                    </h3>
                    <button 
                       onClick={handleRank}
                       disabled={loading}
                       className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                    >
                      {loading ? <span className="animate-spin">⟳</span> : <FiZap />}
                      {loading ? (
                        <span className="flex items-center">
                          {t('cc.calculating')}<span className="w-5 text-left">{loadingDots}</span>
                        </span>
                      ) : t('cc.calculateRanking')}
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                    {candidates.map((c, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-sm font-bold border border-white/10">
                             {c.personal_info?.full_name?.charAt(0) || '?'}
                           </div>
                           <div>
                             <div className="font-medium text-white">{c.personal_info?.full_name || t('common.unknownCandidate')}</div>
                             <div className="text-xs text-gray-500">
                               {(c.experience?.length || 0)} {t('cc.roles')} • {(c.skills?.programming_languages?.length || 0)} {t('cc.languages')}
                             </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Save to Database Button */}
                          {!savedToDB[i] ? (
                            <button
                              onClick={() => saveCandidateToDB(c, i)}
                              disabled={savingToDB[i]}
                              className="p-2 hover:bg-blue-500/20 rounded-lg transition-all opacity-0 group-hover:opacity-100 text-blue-400 hover:text-blue-300"
                              title={t('cc.saveToDatabase')}
                            >
                              {savingToDB[i] ? <span className="animate-spin text-xs">⟳</span> : <FiSave size={16} />}
                            </button>
                          ) : (
                            <FiCheck className="text-emerald-500" size={16} />
                          )}
                          {/* Remove Button */}
                          <button
                            onClick={() => {
                              setCandidates(prev => prev.filter((_, idx) => idx !== i));
                              // Also update savedToDB and savingToDB
                              setSavedToDB(prev => {
                                const updated: Record<number, boolean> = {};
                                Object.entries(prev).forEach(([key, val]) => {
                                  const k = parseInt(key);
                                  if (k < i) updated[k] = val;
                                  else if (k > i) updated[k - 1] = val;
                                });
                                return updated;
                              });
                            }}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-all opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
                            title={t('cc.removeCandidate')}
                          >
                            <FiX size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Results */}
            <div className="lg:col-span-7 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              {rankedCandidates.length > 0 ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h2 className="text-2xl font-bold flex items-center gap-3">
                        <FiBarChart2 className="text-blue-400" /> {t('cc.rankingResults')}
                     </h2>
                  </div>

                  <div className="grid gap-4">
                    {rankedCandidates.map((candidate, idx) => (
                      <CandidateCard key={idx} candidate={candidate} rank={idx + 1} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.02]">
                  <div className="w-24 h-24 mb-6 rounded-full bg-white/5 flex items-center justify-center animate-pulse-glow">
                    <FiTrendingUp className="w-10 h-10 text-gray-600" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2">{t('cc.readyToRank')}</h3>
                  <p className="text-gray-500 max-w-sm">
                    {t('cc.readyToRankDesc')}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {error && (
             <div className="fixed bottom-6 right-6 p-4 bg-red-500/10 border border-red-500 text-red-200 rounded-xl flex items-center gap-3 shadow-2xl backdrop-blur-md animate-slide-in">
               <FiZap /> {error}
               <button onClick={() => setError(null)}><FiX /></button>
             </div>
          )}

        </div>
      </div>

      {/* Database Modal */}
      {showDBModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel rounded-3xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col m-4">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <FiDatabase className="text-purple-400" /> {t('cc.loadCVsFromDB')}
                </h2>
                <p className="text-sm text-gray-400 mt-1">{t('cc.selectCandidatesToAdd')}</p>
              </div>
              <button
                onClick={() => setShowDBModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <FiX className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Search and Actions */}
            <div className="p-6 border-b border-white/10 space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder={t('cc.searchByNameSkills')}
                    value={dbSearchTerm}
                    onChange={(e) => setDbSearchTerm(e.target.value)}
                    onKeyUp={fetchDBCVs}
                    className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  />
                </div>
                <button
                  onClick={toggleSelectAll}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
                >
                  {selectedCVs.size === dbCVs.length ? t('cc.deselectAll') : t('cc.selectAll')}
                </button>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  {dbCVs.length} {t('cc.cvsFound')} • {selectedCVs.size} {t('cc.selected')}
                </span>
                <button
                  onClick={loadSelectedCVs}
                  disabled={selectedCVs.size === 0}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FiCheck /> {t('cc.loadSelected')} ({selectedCVs.size})
                </button>
              </div>
            </div>

            {/* CV List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
              {loadingDB ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : dbCVs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {t('cc.noCVsInDB')}
                </div>
              ) : (
                dbCVs.map((cv) => (
                  <div
                    key={cv.candidate_name}
                    onClick={() => toggleSelectCV(cv.candidate_name)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedCVs.has(cv.candidate_name)
                        ? 'bg-purple-500/20 border-purple-500/50'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedCVs.has(cv.candidate_name)
                          ? 'bg-purple-500 border-purple-500'
                          : 'border-white/30'
                      }`}>
                        {selectedCVs.has(cv.candidate_name) && (
                          <FiCheck className="w-3 h-3 text-white" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{cv.candidate_name}</h4>
                        {cv.skills && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.keys(cv.skills).slice(0, 5).map((skill: string) => (
                              <span key={skill} className="text-xs px-2 py-0.5 bg-white/10 text-gray-300 rounded">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-500 font-mono">
                        {cv.created_at ? new Date(cv.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
}

// Subcomponents
function CandidateCard({ candidate, rank }: { candidate: RankedCandidate, rank: number }) {
  const { t } = useLanguage();
  const isTop3 = rank <= 3;
  
  return (
    <div className={`relative group p-6 rounded-2xl border transition-all duration-500 ${
       isTop3 
         ? 'bg-gradient-to-r from-blue-900/20 to-violet-900/20 border-blue-500/30 hover:border-blue-400/50' 
         : 'bg-white/5 border-white/5 hover:border-white/10'
    }`}>
      {/* Rank Badge */}
      <div className={`absolute -left-3 -top-3 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg z-10 ${
         isTop3 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
      }`}>
        #{rank}
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
              {candidate.candidate_name}
            </h3>
            {isTop3 && <FiAward className="text-yellow-500" />}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-4 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              {t('cc.score')}: {candidate.total_score.toFixed(1)}/100
            </span>
          </div>

          <p className="text-sm text-gray-400 leading-relaxed mb-4 border-l-2 border-white/10 pl-4">
            {candidate.explanation}
          </p>

          {/* Scores breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {Object.entries(candidate.scores).map(([key, val]) => (
               <div key={key} className="bg-black/20 rounded-lg p-2 text-center border border-white/5">
                 <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                   {key.replace('_', ' ')}
                 </div>
                 <div className={`font-mono font-bold ${
                    val > 80 ? 'text-emerald-400' : val > 50 ? 'text-blue-400' : 'text-gray-400'
                 }`}>
                   {val.toFixed(0)}
                 </div>
               </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
