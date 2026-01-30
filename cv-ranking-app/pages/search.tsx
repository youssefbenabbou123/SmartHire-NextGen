import Head from 'next/head';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FiArrowLeft,
  FiSearch,
  FiFilter,
  FiX,
  FiUsers,
  FiBriefcase,
  FiAward,
  FiCode
} from 'react-icons/fi';

interface Candidate {
  candidate_name: string;
  total_score?: number;
  scores?: any;
  experience?: any[];
  skills?: any;
  projects?: any[];
  raw_data?: any;
}

const SKILL_OPTIONS = [
  'Java', 'Python', 'JavaScript', 'TypeScript', 'C#', 'Go', 'Rust',
  'React', 'Vue', 'Angular', 'Node.js', 'Spring Boot',
  'AWS', 'Azure', 'Docker', 'Kubernetes', 'DevOps',
  'SQL', 'MongoDB', 'PostgreSQL', 'Elasticsearch'
];

const EXPERIENCE_LEVELS = ['0-2 years', '2-5 years', '5-10 years', '10+ years'];

export default function SearchCVs() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [minScore, setMinScore] = useState(0);
  const [experienceLevel, setExperienceLevel] = useState('');

  useEffect(() => {
    // Load candidates from localStorage
    const storedRankings = localStorage.getItem('cvRankings');
    if (storedRankings) {
      try {
        const rankings = JSON.parse(storedRankings);
        setCandidates(rankings);
      } catch (e) {
        console.error('Error loading candidates:', e);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Apply filters
    let filtered = [...candidates];

    if (searchTerm) {
      filtered = filtered.filter((c) =>
        c.candidate_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (minScore > 0) {
      filtered = filtered.filter((c) => (c.total_score || 0) >= minScore);
    }

    if (selectedSkills.length > 0) {
      filtered = filtered.filter((c) => {
        const candidateSkills = [
          ...(c.raw_data?.skills?.programming_languages || []),
          ...(c.raw_data?.skills?.frameworks || []),
          ...(c.raw_data?.skills?.web_technologies || []),
        ].map((s: string) => s.toLowerCase());

        return selectedSkills.some((skill) =>
          candidateSkills.some((cs: string) => cs.toLowerCase().includes(skill.toLowerCase()))
        );
      });
    }

    setFilteredCandidates(filtered);
  }, [candidates, searchTerm, selectedSkills, minScore, experienceLevel]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const getExperienceYears = (candidate: Candidate): number => {
    const experiences = candidate.raw_data?.experience || [];
    if (experiences.length === 0) return 0;

    const total = experiences.reduce((sum: number, exp: any) => {
      const parts = (exp.period || '').split('-');
      if (parts.length === 2) {
        const start = parseInt(parts[0]);
        const end = parseInt(parts[1]);
        if (!isNaN(start) && !isNaN(end)) {
          return sum + (end - start);
        }
      }
      return sum;
    }, 0);

    return total;
  };

  const getSkillsForCandidate = (candidate: Candidate): string[] => {
    return [
      ...(candidate.raw_data?.skills?.programming_languages || []),
      ...(candidate.raw_data?.skills?.frameworks || []),
    ].slice(0, 6);
  };

  return (
    <>
      <Head>
        <title>Search CVs - Capgemini Recruitment</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        {/* Header */}
        <div className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/dashboard-new">
                  <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                    <FiArrowLeft className="w-5 h-5" />
                  </button>
                </Link>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600/20 rounded-lg border border-blue-500/30">
                    <FiSearch className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Search CVs</h1>
                    <p className="text-sm text-gray-400">Browse and filter candidates</p>
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-400">
                {filteredCandidates.length} of {candidates.length} candidates
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Search Bar */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-900/50 rounded-lg border border-gray-700">
              <FiSearch className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent outline-none text-white placeholder-gray-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6 space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FiFilter className="w-4 h-4" />
                    Filters
                  </h3>
                </div>

                {/* Min Score */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300">Minimum Score</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={minScore}
                      onChange={(e) => setMinScore(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm font-mono">{minScore}</span>
                  </div>
                </div>

                {/* Skills */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300">Skills</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {SKILL_OPTIONS.map((skill) => (
                      <label key={skill} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSkills.includes(skill)}
                          onChange={() => toggleSkill(skill)}
                          className="w-4 h-4 rounded border-gray-600 text-indigo-600 focus:ring-indigo-600"
                        />
                        <span className="text-sm text-gray-300">{skill}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                {(selectedSkills.length > 0 || searchTerm || minScore > 0) && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedSkills([]);
                      setMinScore(0);
                    }}
                    className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <FiX className="w-4 h-4" />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-3">
              {loading ? (
                <div className="text-center py-12">Loading candidates...</div>
              ) : filteredCandidates.length === 0 ? (
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-12 text-center">
                  <FiUsers className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50" />
                  <p className="text-gray-400">No candidates found matching your criteria</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Upload CVs in the Rank Candidates section to see them here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCandidates.map((candidate, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 hover:border-indigo-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{candidate.candidate_name}</h3>
                          <p className="text-sm text-gray-400 mt-1">
                            {getExperienceYears(candidate)} years of experience
                          </p>
                        </div>
                        {candidate.total_score !== undefined && (
                          <div className="text-right">
                            <div className="text-3xl font-bold text-indigo-400">{candidate.total_score.toFixed(1)}</div>
                            <div className="text-xs text-gray-400">/100</div>
                          </div>
                        )}
                      </div>

                      {/* Skills Tags */}
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                          {getSkillsForCandidate(candidate).map((skill, i) => (
                            <span
                              key={i}
                              className="text-xs bg-indigo-600/30 text-indigo-200 px-2 py-1 rounded border border-indigo-500/50"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Score Breakdown */}
                      {candidate.scores && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-4 border-t border-gray-700">
                          <div className="text-center">
                            <div className="text-xs text-gray-400">Experience</div>
                            <div className="font-semibold text-sm mt-1">
                              {candidate.scores.experience_quality?.toFixed(1) || '-'}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-400">Skills</div>
                            <div className="font-semibold text-sm mt-1">
                              {candidate.scores.technical_skills?.toFixed(1) || '-'}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-400">Projects</div>
                            <div className="font-semibold text-sm mt-1">
                              {candidate.scores.projects_impact?.toFixed(1) || '-'}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-400">Education</div>
                            <div className="font-semibold text-sm mt-1">
                              {candidate.scores.education_certifications?.toFixed(1) || '-'}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-400">Signal</div>
                            <div className="font-semibold text-sm mt-1">
                              {candidate.scores.signal_consistency?.toFixed(1) || '-'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
