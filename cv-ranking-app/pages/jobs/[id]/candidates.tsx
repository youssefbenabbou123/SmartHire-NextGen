import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import { 
  FiArrowLeft, FiUser, FiCheck, FiX, FiStar, 
  FiZap, FiAward, FiTrendingUp, FiMail, FiMapPin,
  FiChevronDown, FiChevronUp, FiLoader, FiRefreshCw
} from 'react-icons/fi';

interface Job {
  _id: string;
  title: string;
  skills: string[];
  experience: string | null;
  seniority: string | null;
  location: string | null;
}

interface SkillMatch {
  skill: string;
  type: 'exact' | 'variation' | 'similar' | 'none';
  similarity: number;
}

interface MatchedCandidate {
  id: string;
  rank: number;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  matchScore: number;
  skillMatches: SkillMatch[];
  matchedSkillNames: string[];
  missingSkills: string[];
  exactMatchCount: number;
  totalMatchCount: number;
  totalRequired: number;
  allSkills: string[];
  education?: string;
  experience_years?: number;
  summary?: string;
}

interface MatchResult {
  candidates: MatchedCandidate[];
  total: number;
  excellentCount: number;
  goodCount: number;
  fairCount: number;
}

export default function JobCandidatesPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<MatchedCandidate[]>([]);
  const [stats, setStats] = useState({ total: 0, excellent: 0, good: 0, fair: 0 });
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);
  const [shortlisted, setShortlisted] = useState<Set<string>>(new Set());
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'excellent' | 'good' | 'fair'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'name'>('score');
  const [emailModal, setEmailModal] = useState<{ open: boolean; candidate: MatchedCandidate | null; bulk?: boolean }>({ open: false, candidate: null });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  useEffect(() => {
    if (id) {
      loadJobAndMatch();
    }
  }, [id]);

  const loadJobAndMatch = async () => {
    setLoading(true);
    try {
      // Load job details
      const jobRes = await fetch(`/api/jobs?id=${id}`);
      if (!jobRes.ok) throw new Error('Job not found');
      const jobData = await jobRes.json();
      setJob(jobData);

      // Start matching process
      await matchCandidates(jobData);
    } catch (error) {
      console.error('Error:', error);
      router.push('/jobs');
    } finally {
      setLoading(false);
    }
  };

  const matchCandidates = async (jobData: Job) => {
    setMatching(true);

    try {
      // Call the match-candidates API (uses cosine similarity, no AI)
      const response = await fetch('/api/match-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: jobData._id,
          requiredSkills: jobData.skills || [],
          experienceRequired: jobData.experience,
        }),
      });

      if (!response.ok) {
        throw new Error('Matching failed');
      }

      const data: MatchResult = await response.json();
      setCandidates(data.candidates);
      setStats({
        total: data.total,
        excellent: data.excellentCount,
        good: data.goodCount,
        fair: data.fairCount,
      });

      // Save to ranking history
      if (data.candidates.length > 0) {
        fetch('/api/ranking-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobTitle: jobData.title,
            skills: jobData.skills || [],
            weights: {},
            candidatesCount: data.total,
            rankedCandidates: data.candidates.slice(0, 10).map(c => ({
              name: c.name,
              score: c.matchScore,
              skills: c.matchedSkillNames
            })),
            bestCandidate: data.candidates.length > 0 ? {
              name: data.candidates[0].name,
              score: data.candidates[0].matchScore
            } : null,
            jobId: jobData._id
          })
        }).catch(console.error);
      }
    } catch (error) {
      console.error('Matching error:', error);
    } finally {
      setMatching(false);
    }
  };

  const toggleShortlist = (candidateId: string) => {
    setShortlisted(prev => {
      const next = new Set(prev);
      const candidate = candidates.find(c => c.id === candidateId);
      const candidateName = candidate?.name || 'Candidate';
      
      if (next.has(candidateId)) {
        next.delete(candidateId);
        // Show feedback
        const toast = document.createElement('div');
        toast.className = 'fixed top-20 right-6 glass-panel rounded-xl px-4 py-3 shadow-2xl z-50 animate-fade-in-up';
        toast.innerHTML = `
          <div class="flex items-center gap-2 text-yellow-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span class="text-white">Removed from shortlist</span>
          </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(-10px)';
          setTimeout(() => toast.remove(), 300);
        }, 2000);
      } else {
        next.add(candidateId);
        // Show feedback
        const toast = document.createElement('div');
        toast.className = 'fixed top-20 right-6 glass-panel rounded-xl px-4 py-3 shadow-2xl z-50 animate-fade-in-up';
        toast.innerHTML = `
          <div class="flex items-center gap-2 text-yellow-400">
            <svg class="w-5 h-5 fill-current" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span class="text-white">Added to shortlist</span>
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

  const toggleSelect = (candidateId: string) => {
    setSelectedCandidates(prev => {
      const next = new Set(prev);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  };

  const selectAll = () => {
    const allIds = new Set(filteredCandidates.map(c => c.id));
    setSelectedCandidates(allIds);
  };

  const deselectAll = () => {
    setSelectedCandidates(new Set());
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-blue-500 to-cyan-500';
    if (score >= 40) return 'from-yellow-500 to-orange-500';
    return 'from-gray-500 to-gray-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Fair Match';
    return 'Low Match';
  };

  const filteredCandidates = candidates.filter(c => {
    if (filter === 'excellent') return c.matchScore >= 80;
    if (filter === 'good') return c.matchScore >= 60 && c.matchScore < 80;
    if (filter === 'fair') return c.matchScore < 60;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return b.matchScore - a.matchScore;
  });

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-24 flex items-center justify-center">
          <div className="aurora-bg"></div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center animate-pulse">
              <FiZap className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Loading Job Details...</h2>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Find Candidates - {job?.title} - Smart Hire</title>
      </Head>
      <Navbar />

      <div className="min-h-screen pt-24 pb-12 px-4">
        <div className="aurora-bg"></div>

        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href={`/jobs/${id}`} className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors">
              <FiArrowLeft /> Back to Job
            </Link>
            
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                    <FiZap className="text-yellow-400" />
                    Candidate Matching
                  </h1>
                  <p className="text-gray-400">
                    Finding best matches for: <span className="text-white font-medium">{job?.title}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Using cosine similarity &amp; skill matching algorithms
                  </p>
                </div>

                <button
                  onClick={() => job && matchCandidates(job)}
                  disabled={matching}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl transition-all"
                >
                  <FiRefreshCw className={matching ? 'animate-spin' : ''} />
                  Re-match
                </button>
              </div>

              {/* Required Skills Preview */}
              {job?.skills && job.skills.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <span className="text-sm text-gray-400">Required skills ({job.skills.length}): </span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {job.skills.map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Matching Progress */}
          {matching && (
            <div className="glass-panel rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center">
                  <FiLoader className="w-6 h-6 text-white animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Matching in Progress...</h3>
                  <p className="text-gray-400">Analyzing candidates with cosine similarity</p>
                </div>
              </div>
            </div>
          )}

          {/* Results Stats */}
          {!matching && candidates.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="glass-card rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-white">{stats.total}</div>
                <div className="text-sm text-gray-400">Total Candidates</div>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-green-400">{stats.excellent}</div>
                <div className="text-sm text-gray-400">Excellent (80%+)</div>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-blue-400">{stats.good}</div>
                <div className="text-sm text-gray-400">Good (60-79%)</div>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-yellow-400">{shortlisted.size}</div>
                <div className="text-sm text-gray-400">Shortlisted</div>
              </div>
            </div>
          )}

          {/* Filters and Selection Controls */}
          {!matching && candidates.length > 0 && (
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1">
                {(['all', 'excellent', 'good', 'fair'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filter === f 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    {f === 'all' && ` (${stats.total})`}
                    {f === 'excellent' && ` (${stats.excellent})`}
                    {f === 'good' && ` (${stats.good})`}
                    {f === 'fair' && ` (${stats.fair})`}
                  </button>
                ))}
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'score' | 'name')}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 text-sm focus:outline-none"
              >
                <option value="score">Sort by Match Score</option>
                <option value="name">Sort by Name</option>
              </select>

              {/* Selection Controls */}
              <div className="flex items-center gap-2 ml-auto">
                {selectedCandidates.size > 0 && (
                  <>
                    <button
                      onClick={deselectAll}
                      className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Deselect All
                    </button>
                    <button
                      onClick={() => {
                        const selected = candidates.filter(c => selectedCandidates.has(c.id) && c.email);
                        if (selected.length === 0) {
                          alert('No selected candidates with email addresses');
                          return;
                        }
                        setEmailSubject(`Opportunity: ${job?.title}`);
                        setEmailBody(`Dear Candidate,\n\nWe are pleased to inform you that your profile matches our requirements for the position of ${job?.title}.\n\nWe would like to invite you for the next steps in our recruitment process.\n\nBest regards,\nCapgemini Smart Hire Team`);
                        setEmailModal({ open: true, candidate: null, bulk: true });
                      }}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                    >
                      <FiMail className="w-4 h-4" />
                      Email Selected ({selectedCandidates.size})
                    </button>
                  </>
                )}
                {selectedCandidates.size === 0 && (
                  <button
                    onClick={selectAll}
                    className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Select All
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Candidates List */}
          {!matching && (
            <div className="space-y-4">
              {filteredCandidates.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gray-800 flex items-center justify-center mb-4">
                    <FiUser className="w-10 h-10 text-gray-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {candidates.length === 0 ? 'No candidates found' : 'No matches for this filter'}
                  </h3>
                  <p className="text-gray-400">
                    {candidates.length === 0 
                      ? 'Upload CVs to the CV Vault first to find candidates'
                      : 'Try adjusting your filter settings'
                    }
                  </p>
                </div>
              ) : (
                filteredCandidates.map((candidate, index) => (
                  <div 
                    key={candidate.id}
                    className={`glass-card rounded-2xl overflow-hidden transition-all ${
                      shortlisted.has(candidate.id) ? 'ring-2 ring-yellow-500/50' : ''
                    } ${selectedCandidates.has(candidate.id) ? 'ring-2 ring-green-500/50' : ''}`}
                  >
                    {/* Main Row */}
                    <div className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                        <div className="flex items-center pt-1">
                          <input
                            type="checkbox"
                            checked={selectedCandidates.has(candidate.id)}
                            onChange={() => toggleSelect(candidate.id)}
                            className="w-5 h-5 rounded border-white/20 bg-white/5 text-green-500 focus:ring-green-500 focus:ring-2 cursor-pointer"
                          />
                        </div>
                        {/* Rank Badge */}
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getScoreColor(candidate.matchScore)} flex items-center justify-center shrink-0`}>
                          {candidate.rank <= 3 ? (
                            <FiAward className="w-6 h-6 text-white" />
                          ) : (
                            <span className="text-xl font-bold text-white">#{candidate.rank}</span>
                          )}
                        </div>

                        {/* Main Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-xl font-bold text-white truncate">{candidate.name}</h3>
                            {candidate.rank === 1 && (
                              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-full flex items-center gap-1">
                                <FiStar className="w-3 h-3" /> TOP MATCH
                              </span>
                            )}
                          </div>

                          {/* Contact Info */}
                          <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-3">
                            {candidate.email && (
                              <span className="flex items-center gap-1">
                                <FiMail className="w-4 h-4" /> {candidate.email}
                              </span>
                            )}
                            {candidate.location && (
                              <span className="flex items-center gap-1">
                                <FiMapPin className="w-4 h-4" /> {candidate.location}
                              </span>
                            )}
                            {candidate.experience_years !== undefined && candidate.experience_years > 0 && (
                              <span className="flex items-center gap-1">
                                <FiTrendingUp className="w-4 h-4" /> {candidate.experience_years} years exp.
                              </span>
                            )}
                          </div>

                          {/* Skill Matches Summary */}
                          <div className="flex flex-wrap gap-2 mb-2">
                            <span className="text-xs text-gray-500">
                              {candidate.totalMatchCount}/{candidate.totalRequired} skills matched
                              {(candidate.exactMatchCount > 0 || candidate.skillMatches.filter(m => m.type === 'variation').length > 0) && 
                                ` (${candidate.exactMatchCount + candidate.skillMatches.filter(m => m.type === 'variation').length} exact/variation)`}
                            </span>
                          </div>

                          {/* Skill Tags */}
                          <div className="flex flex-wrap gap-2">
                            {candidate.skillMatches.slice(0, 5).map((match, i) => (
                              <span 
                                key={i} 
                                className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                                  match.type === 'exact' || match.type === 'variation' ? 'bg-green-500/20 text-green-400' :
                                  match.type === 'similar' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}
                              >
                                <FiCheck className="w-3 h-3" /> 
                                {match.skill}
                                {match.type === 'similar' && (
                                  <span className="opacity-60">({Math.round(match.similarity * 100)}%)</span>
                                )}
                              </span>
                            ))}
                            {candidate.missingSkills.slice(0, 2).map((skill, i) => (
                              <span key={i} className="px-2 py-1 bg-red-500/10 text-red-400/70 rounded text-xs font-medium flex items-center gap-1">
                                <FiX className="w-3 h-3" /> {skill}
                              </span>
                            ))}
                            {candidate.missingSkills.length > 2 && (
                              <span className="px-2 py-1 bg-gray-700/50 text-gray-500 rounded text-xs">
                                +{candidate.missingSkills.length - 2} missing
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Score & Actions */}
                        <div className="flex flex-col items-end gap-3 shrink-0">
                          {/* Score Circle */}
                          <div className="relative w-20 h-20">
                            <svg className="w-20 h-20 transform -rotate-90">
                              <circle cx="40" cy="40" r="35" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
                              <circle 
                                cx="40" cy="40" r="35" 
                                stroke={candidate.matchScore >= 80 ? '#22c55e' : candidate.matchScore >= 60 ? '#3b82f6' : '#f59e0b'}
                                strokeWidth="6" 
                                fill="none"
                                strokeDasharray={`${candidate.matchScore * 2.2} 220`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-2xl font-bold text-white">{Math.round(candidate.matchScore)}</span>
                              <span className="text-xs text-gray-400">%</span>
                            </div>
                          </div>

                          <span className={`text-xs font-medium ${
                            candidate.matchScore >= 80 ? 'text-green-400' :
                            candidate.matchScore >= 60 ? 'text-blue-400' : 'text-yellow-400'
                          }`}>
                            {getScoreLabel(candidate.matchScore)}
                          </span>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleShortlist(candidate.id)}
                              className={`p-2 rounded-lg transition-all ${
                                shortlisted.has(candidate.id)
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-white/5 text-gray-400 hover:bg-yellow-500/10 hover:text-yellow-400'
                              }`}
                              title={shortlisted.has(candidate.id) ? 'Remove from shortlist' : 'Add to shortlist'}
                            >
                              <FiStar className={`w-5 h-5 ${shortlisted.has(candidate.id) ? 'fill-current' : ''}`} />
                            </button>
                            <button
                              onClick={() => setExpandedCandidate(expandedCandidate === candidate.id ? null : candidate.id)}
                              className="p-2 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white rounded-lg transition-all"
                            >
                              {expandedCandidate === candidate.id ? <FiChevronUp /> : <FiChevronDown />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedCandidate === candidate.id && (
                      <div className="px-6 pb-6 border-t border-white/5 pt-4 animate-fade-in">
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* All Skills */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-400 mb-3">All Candidate Skills</h4>
                            <div className="flex flex-wrap gap-2">
                              {candidate.allSkills.map((skill, i) => {
                                const isMatched = candidate.matchedSkillNames.some(
                                  m => m.toLowerCase() === skill.toLowerCase()
                                );
                                return (
                                  <span 
                                    key={i} 
                                    className={`px-2 py-1 rounded text-xs ${
                                      isMatched
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-white/10 text-gray-300'
                                    }`}
                                  >
                                    {skill}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          {/* Summary */}
                          {candidate.summary && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-400 mb-3">Summary</h4>
                              <p className="text-gray-300 text-sm leading-relaxed">
                                {candidate.summary.slice(0, 300)}
                                {candidate.summary.length > 300 && '...'}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Match Details */}
                        <div className="mt-4 pt-4 border-t border-white/5">
                          <h4 className="text-sm font-semibold text-gray-400 mb-3">Match Details</h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="bg-green-500/10 rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-green-400">{candidate.exactMatchCount}</div>
                              <div className="text-xs text-gray-400">Exact Matches</div>
                            </div>
                            <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-blue-400">{candidate.totalMatchCount - candidate.exactMatchCount}</div>
                              <div className="text-xs text-gray-400">Similar Matches</div>
                            </div>
                            <div className="bg-red-500/10 rounded-lg p-3 text-center">
                              <div className="text-lg font-bold text-red-400">{candidate.missingSkills.length}</div>
                              <div className="text-xs text-gray-400">Missing Skills</div>
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-3 mt-4 pt-4 border-t border-white/5">
                          <Link
                            href={`/candidate/${encodeURIComponent(candidate.name)}`}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-all"
                          >
                            <FiUser className="w-4 h-4" /> View Full Profile
                          </Link>
                          {candidate.email && (
                            <button
                              onClick={() => {
                                setEmailSubject(`Opportunity: ${job?.title}`);
                                setEmailBody(`Dear ${candidate.name},\n\nWe are pleased to inform you that your profile matches our requirements for the position of ${job?.title}.\n\nWe would like to invite you for the next steps in our recruitment process.\n\nBest regards,\nCapgemini Smart Hire Team`);
                                setEmailModal({ open: true, candidate });
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm transition-all"
                            >
                              <FiMail className="w-4 h-4" /> Send Email
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Email Modal */}
          {emailModal.open && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="glass-panel rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <FiMail className="w-5 h-5 text-green-400" />
                    {emailModal.bulk 
                      ? `Send Email to ${selectedCandidates.size > 0 ? selectedCandidates.size : shortlisted.size} Selected Candidates`
                      : `Send Email to ${emailModal.candidate?.name}`
                    }
                  </h3>
                  <button
                    onClick={() => setEmailModal({ open: false, candidate: null })}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  {!emailModal.bulk && emailModal.candidate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        To
                      </label>
                      <input
                        type="email"
                        value={emailModal.candidate.email || ''}
                        disabled
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 cursor-not-allowed"
                      />
                    </div>
                  )}
                  {emailModal.bulk && (() => {
                    const recipients = selectedCandidates.size > 0
                      ? candidates.filter(c => selectedCandidates.has(c.id) && c.email)
                      : candidates.filter(c => shortlisted.has(c.id) && c.email);
                    return (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Recipients ({recipients.length} candidates)
                        </label>
                        <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 max-h-32 overflow-y-auto">
                          {recipients.length > 0 ? (
                            recipients.map(c => (
                              <div key={c.id} className="text-sm py-1 flex items-center gap-2">
                                <span className="text-white font-medium">{c.name}:</span>
                                <span>{c.email}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-gray-500 py-2">No email addresses found for selected candidates</div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Email subject"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Message
                    </label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={10}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Email message"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={async () => {
                        if (!emailSubject || !emailBody) {
                          alert('Please fill in all fields');
                          return;
                        }

                        setSendingEmail(true);
                        try {
                          if (emailModal.bulk) {
                            // Send to selected candidates (or shortlisted if no selection)
                            const recipients = (selectedCandidates.size > 0
                              ? candidates.filter(c => selectedCandidates.has(c.id) && c.email)
                              : candidates.filter(c => shortlisted.has(c.id) && c.email)
                            ).map(c => c.email!);

                            if (recipients.length === 0) {
                              alert('No valid email addresses found in shortlisted candidates');
                              setSendingEmail(false);
                              return;
                            }

                            // Send emails one by one (or use BCC for bulk)
                            let successCount = 0;
                            let failCount = 0;

                            for (const email of recipients) {
                              try {
                                const response = await fetch('/api/send-email', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    to: email,
                                    subject: emailSubject,
                                    text: emailBody,
                                    html: emailBody.replace(/\n/g, '<br>'),
                                  }),
                                });

                                if (response.ok) {
                                  successCount++;
                                } else {
                                  failCount++;
                                }
                              } catch (error) {
                                failCount++;
                              }
                            }

                            alert(`Emails sent: ${successCount} successful, ${failCount} failed`);
                          } else {
                            // Send to single candidate
                            if (!emailModal.candidate?.email) {
                              alert('No email address found');
                              setSendingEmail(false);
                              return;
                            }

                            const response = await fetch('/api/send-email', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                to: emailModal.candidate.email,
                                subject: emailSubject,
                                text: emailBody,
                                html: emailBody.replace(/\n/g, '<br>'),
                              }),
                            });

                            const data = await response.json();

                            if (response.ok) {
                              alert('Email sent successfully!');
                            } else {
                              alert(`Failed to send email: ${data.error || 'Unknown error'}`);
                            }
                          }

                          setEmailModal({ open: false, candidate: null });
                          setEmailSubject('');
                          setEmailBody('');
                          if (emailModal.bulk && selectedCandidates.size > 0) {
                            setSelectedCandidates(new Set());
                          }
                        } catch (error: any) {
                          console.error('Error sending email:', error);
                          alert(`Error sending email: ${error.message}`);
                        } finally {
                          setSendingEmail(false);
                        }
                      }}
                      disabled={sendingEmail || !emailSubject || !emailBody}
                      className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                    >
                      {sendingEmail ? (
                        <>
                          <FiLoader className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <FiMail className="w-4 h-4" />
                          {emailModal.bulk ? `Send to ${selectedCandidates.size > 0 ? selectedCandidates.size : shortlisted.size} Candidates` : 'Send Email'}
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setEmailModal({ open: false, candidate: null })}
                      disabled={sendingEmail}
                      className="px-4 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-gray-300 rounded-lg font-medium transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Floating Shortlist Summary */}
          {shortlisted.size > 0 && (
            <div className="fixed bottom-6 right-6 glass-panel rounded-2xl p-4 shadow-2xl animate-fade-in-up z-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <FiStar className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <div className="text-white font-bold">{shortlisted.size} Shortlisted</div>
                  <div className="text-gray-400 text-sm">Ready for next steps</div>
                </div>
                <button
                  onClick={() => {
                    const shortlistedCandidates = candidates.filter(c => shortlisted.has(c.id));
                    if (shortlistedCandidates.length === 0) {
                      alert('No candidates shortlisted');
                      return;
                    }
                    setEmailSubject(`Opportunity: ${job?.title}`);
                    setEmailBody(`Dear Candidate,\n\nWe are pleased to inform you that your profile matches our requirements for the position of ${job?.title}.\n\nWe would like to invite you for the next steps in our recruitment process.\n\nBest regards,\nCapgemini Smart Hire Team`);
                    setEmailModal({ open: true, candidate: null, bulk: true });
                  }}
                  className="ml-4 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-all flex items-center gap-2"
                >
                  <FiMail className="w-4 h-4" />
                  Email All ({shortlisted.size})
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
