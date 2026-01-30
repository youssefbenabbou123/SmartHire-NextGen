import Head from 'next/head';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  FiSettings, 
  FiSave, 
  FiRotateCcw,
  FiArrowLeft,
  FiBriefcase,
  FiTool,
  FiBox,
  FiBook,
  FiZap,
  FiInfo,
  FiHelpCircle
} from 'react-icons/fi';

// Tooltip component
const Tooltip = ({ text }: { text: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="w-4 h-4 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-help ml-1"
      >
        <span className="text-[10px] font-bold">?</span>
      </button>
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 border border-white/20 rounded-lg shadow-xl text-xs text-gray-200 whitespace-normal w-48 text-left animate-fade-in">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
};

// Info text for each field
const HELP_TEXT = {
  // Weights
  experience: "How much the candidate's work history contributes to their total score. Higher values prioritize experienced candidates.",
  technicalSkills: "Points awarded for matching required skills. Higher values favor candidates with the exact tech stack needed.",
  projects: "Evaluates personal/professional projects. Useful for assessing practical experience beyond jobs.",
  education: "Weight given to degrees and certifications. Lower for roles where experience matters more than formal education.",
  signal: "Measures CV consistency and red flags (gaps, job hopping). Helps filter unreliable profiles.",
  
  // Company Tiers
  faang: "FAANG = Facebook/Meta, Amazon, Apple, Netflix, Google. Top-tier tech companies with rigorous hiring.",
  topTier: "Major consulting firms like Capgemini, Accenture, Deloitte, and well-known tech companies.",
  midTier: "Established tech companies with good reputation but less competitive than top tier.",
  smallTech: "Smaller technology companies, often specialized or regional players.",
  startup: "Early-stage companies. Experience here shows initiative but may lack structured training.",
  otherCompany: "Companies outside tech industry or unknown organizations.",
  
  // Duration
  veryShort: "Less than 3 months. May indicate probation failure or contract work.",
  short: "3-6 months. Could be internships or short contracts.",
  decent: "6-12 months. Minimum expected for meaningful contributions.",
  good: "1-2 years. Shows commitment and ability to grow in a role.",
  strong: "2+ years. Demonstrates loyalty and deep expertise in the position.",
  
  // Recency
  current: "Bonus for currently employed candidates. They're actively in the field.",
  recent1Year: "Left within the last year. Skills are still fresh and relevant.",
  recent2Years: "Left within 2 years. Minor bonus for recent activity.",
  old5YearsPlus: "Experience from 5+ years ago. May be outdated, hence negative adjustment.",
  
  // Other Experience Parameters
  roleRelevanceMax: "Maximum points for how well job titles match the target role.",
  multipleExperienceBonus: "Extra points for having multiple relevant job experiences.",
  
  // Technical Skills
  matchingRequiredSkills: "Points for having the exact skills listed in job requirements.",
  depthBonus: "Extra points for having many skills, showing versatility.",
  minSkillsForDepth: "Minimum number of skills needed to qualify for the depth bonus.",
  
  // Projects
  basePointsPerProject: "Points awarded for each relevant project in their portfolio.",
  maxProjects: "Maximum number of projects to consider. Prevents score inflation.",
  relevanceBonus: "Extra points if project tech matches required skills.",
  noMatchPenalty: "Penalty if no projects relate to the job requirements.",
  
  // Education
  phdPoints: "Points for PhD degree. Highest academic achievement.",
  masterPoints: "Points for Master's degree. Advanced specialization.",
  bachelorPoints: "Points for Bachelor's degree. Standard higher education.",
  maxEducationScore: "Maximum total education score to prevent over-weighting academics.",
  certificationBonus: "Bonus points per relevant certification (AWS, Azure, etc.).",
  
  // Signal
  maxScore: "Maximum signal score. Deductions apply for inconsistencies or red flags.",
};

interface ScoringConfig {
  // Category Weights (total 100)
  weights: {
    experience: number;
    technical_skills: number;
    projects: number;
    education: number;
    signal: number;
  };
  
  // Experience Scoring
  experience: {
    companyTierMultipliers: {
      faang: number;
      topTier: number;
      midTier: number;
      smallTech: number;
      startup: number;
      other: number;
    };
    durationThresholds: {
      veryShort: { months: number; points: number };
      short: { months: number; points: number };
      decent: { months: number; points: number };
      good: { months: number; points: number };
      strong: { months: number; points: number };
    };
    recencyBonus: {
      current: number;
      recent1Year: number;
      recent2Years: number;
      old5YearsPlus: number;
    };
    roleRelevanceMax: number;
    multipleExperienceBonus: number;
  };
  
  // Technical Skills Scoring
  technicalSkills: {
    matchingRequiredSkills: number;
    depthBonus: number;
    minSkillsForDepth: number;
  };
  
  // Projects Scoring
  projects: {
    basePointsPerProject: number;
    maxProjects: number;
    relevanceBonus: number;
    noMatchPenalty: number;
  };
  
  // Education Scoring
  education: {
    phdPoints: number;
    masterPoints: number;
    bachelorPoints: number;
    maxEducationScore: number;
    certificationBonus: number;
  };
  
  // Signal/Consistency Scoring
  signal: {
    maxScore: number;
  };
}

const defaultConfig: ScoringConfig = {
  weights: {
    experience: 35,
    technical_skills: 25,
    projects: 20,
    education: 10,
    signal: 10,
  },
  experience: {
    companyTierMultipliers: {
      faang: 1.0,
      topTier: 0.85,
      midTier: 0.7,
      smallTech: 0.6,
      startup: 0.5,
      other: 0.4,
    },
    durationThresholds: {
      veryShort: { months: 3, points: 2.0 },
      short: { months: 6, points: 5.0 },
      decent: { months: 12, points: 7.0 },
      good: { months: 24, points: 9.0 },
      strong: { months: 24, points: 10.0 },
    },
    recencyBonus: {
      current: 2.0,
      recent1Year: 1.5,
      recent2Years: 1.0,
      old5YearsPlus: -1.0,
    },
    roleRelevanceMax: 10,
    multipleExperienceBonus: 1.5,
  },
  technicalSkills: {
    matchingRequiredSkills: 20,
    depthBonus: 5,
    minSkillsForDepth: 10,
  },
  projects: {
    basePointsPerProject: 7.5,
    maxProjects: 2,
    relevanceBonus: 2.0,
    noMatchPenalty: -6.0,
  },
  education: {
    phdPoints: 10,
    masterPoints: 8,
    bachelorPoints: 5,
    maxEducationScore: 10,
    certificationBonus: 1,
  },
  signal: {
    maxScore: 10,
  },
};

export default function Methodology() {
  const { t } = useLanguage();
  const [config, setConfig] = useState<ScoringConfig>(defaultConfig);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load from localStorage
    const savedConfig = localStorage.getItem('scoringConfig');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error('Error loading config:', e);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('scoringConfig', JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setConfig(defaultConfig);
    localStorage.removeItem('scoringConfig');
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const updateWeight = (key: keyof ScoringConfig['weights'], value: number) => {
    setConfig(prev => ({
      ...prev,
      weights: { ...prev.weights, [key]: value }
    }));
  };

  const updateExperienceCompany = (key: keyof ScoringConfig['experience']['companyTierMultipliers'], value: number) => {
    setConfig(prev => ({
      ...prev,
      experience: {
        ...prev.experience,
        companyTierMultipliers: {
          ...prev.experience.companyTierMultipliers,
          [key]: value
        }
      }
    }));
  };

  const updateExperienceRecency = (key: keyof ScoringConfig['experience']['recencyBonus'], value: number) => {
    setConfig(prev => ({
      ...prev,
      experience: {
        ...prev.experience,
        recencyBonus: {
          ...prev.experience.recencyBonus,
          [key]: value
        }
      }
    }));
  };

  const updateExperienceDuration = (key: keyof ScoringConfig['experience']['durationThresholds'], field: 'months' | 'points', value: number) => {
    setConfig(prev => ({
      ...prev,
      experience: {
        ...prev.experience,
        durationThresholds: {
          ...prev.experience.durationThresholds,
          [key]: {
            ...prev.experience.durationThresholds[key],
            [field]: value
          }
        }
      }
    }));
  };

  const totalWeight = Object.values(config.weights).reduce((sum, val) => sum + val, 0);
  const isWeightValid = totalWeight === 100;

  return (
    <>
      <Head>
        <title>{t('methodology.scoringMethodology')} - CV Ranking System</title>
      </Head>

      <div className="min-h-screen pt-20 relative">
        <div className="aurora-bg"></div>
        
        {/* Hero Header */}
        <div className="border-b border-white/5 bg-black/20 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Link href="/">
                  <button className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group">
                    <FiArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  </button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    {t('methodology.scoringMethodology')}
                  </h1>
                  <p className="text-gray-400 mt-1">{t('methodology.fineTune')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className={`px-4 py-2 rounded-xl ${isWeightValid ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                  <span className={`text-lg font-bold ${isWeightValid ? 'text-emerald-400' : 'text-red-400'}`}>
                    {totalWeight}/100
                  </span>
                  <span className="text-xs text-gray-400 ml-2">{t('methodology.weightTotal')}</span>
                </div>
                
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all flex items-center gap-2 text-gray-300"
                >
                  <FiRotateCcw className="w-4 h-4" />
                  {t('methodology.reset')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isWeightValid}
                  className={`px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 font-medium ${
                    saved 
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                      : isWeightValid
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <FiSave className="w-4 h-4" />
                  {saved ? t('methodology.saved') : t('methodology.saveChanges')}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          
          {/* Weight Distribution */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
                <FiSettings className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">{t('methodology.categoryWeights')}</h2>
                <p className="text-sm text-gray-400">{t('methodology.distributePoints')}</p>
              </div>
            </div>

            {/* Visual weight bar */}
            <div className="h-3 rounded-full bg-gray-800 overflow-hidden mb-6 flex">
              <div style={{ width: `${config.weights.experience}%` }} className="bg-blue-500 transition-all" />
              <div style={{ width: `${config.weights.technical_skills}%` }} className="bg-green-500 transition-all" />
              <div style={{ width: `${config.weights.projects}%` }} className="bg-amber-500 transition-all" />
              <div style={{ width: `${config.weights.education}%` }} className="bg-purple-500 transition-all" />
              <div style={{ width: `${config.weights.signal}%` }} className="bg-pink-500 transition-all" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-3">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <FiBriefcase className="w-4 h-4 text-blue-400" />
                  {t('methodology.experience')}
                  <Tooltip text={HELP_TEXT.experience} />
                </label>
                <input
                  type="number"
                  value={config.weights.experience}
                  onChange={(e) => updateWeight('experience', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 bg-gray-900/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white font-medium text-lg text-center"
                  min="0"
                  max="100"
                  step="1"
                />
              </div>

              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-3">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <FiTool className="w-4 h-4 text-green-400" />
                  {t('methodology.technicalSkills')}
                  <Tooltip text={HELP_TEXT.technicalSkills} />
                </label>
                <input
                  type="number"
                  value={config.weights.technical_skills}
                  onChange={(e) => updateWeight('technical_skills', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 bg-gray-900/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white font-medium text-lg text-center"
                  min="0"
                  max="100"
                  step="1"
                />
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-3">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <FiBox className="w-4 h-4 text-amber-400" />
                  {t('methodology.projects')}
                  <Tooltip text={HELP_TEXT.projects} />
                </label>
                <input
                  type="number"
                  value={config.weights.projects}
                  onChange={(e) => updateWeight('projects', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 bg-gray-900/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white font-medium text-lg text-center"
                  min="0"
                  max="100"
                  step="1"
                />
              </div>

              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 space-y-3">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <FiBook className="w-4 h-4 text-purple-400" />
                  {t('methodology.education')}
                  <Tooltip text={HELP_TEXT.education} />
                </label>
                <input
                  type="number"
                  value={config.weights.education}
                  onChange={(e) => updateWeight('education', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 bg-gray-900/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white font-medium text-lg text-center"
                  min="0"
                  max="100"
                  step="1"
                />
              </div>

              <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4 space-y-3">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <FiZap className="w-4 h-4 text-pink-400" />
                  {t('methodology.signal')}
                  <Tooltip text={HELP_TEXT.signal} />
                </label>
                <input
                  type="number"
                  value={config.weights.signal}
                  onChange={(e) => updateWeight('signal', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 bg-gray-900/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-white font-medium text-lg text-center"
                  min="0"
                  max="100"
                  step="1"
                />
              </div>
            </div>
          </div>

          {/* Experience Parameters */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg shadow-blue-500/20">
                <FiBriefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{t('methodology.experienceScoring')}</h2>
                <p className="text-sm text-gray-400">{t('methodology.companyTiersRecency')}</p>
              </div>
            </div>

            {/* Company Tier Multipliers */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-200">{t('methodology.companyTierMultipliers')}</h3>
              <p className="text-xs text-gray-500 mb-4">{t('methodology.higherMultiplier')}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white/5 rounded-xl p-3 space-y-2">
                  <label className="text-xs font-medium text-gray-400 flex items-center gap-1">
                    FAANG
                    <Tooltip text={HELP_TEXT.faang} />
                  </label>
                  <input
                    type="number"
                    value={config.experience.companyTierMultipliers.faang}
                    onChange={(e) => updateExperienceCompany('faang', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 text-white text-center"
                    min="0"
                    max="1"
                    step="0.05"
                  />
                </div>
                <div className="bg-white/5 rounded-xl p-3 space-y-2">
                  <label className="text-xs font-medium text-gray-400 flex items-center gap-1">
                    Top Tier
                    <Tooltip text={HELP_TEXT.topTier} />
                  </label>
                  <input
                    type="number"
                    value={config.experience.companyTierMultipliers.topTier}
                    onChange={(e) => updateExperienceCompany('topTier', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 text-white text-center"
                    min="0"
                    max="1"
                    step="0.05"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                    Mid Tier
                    <Tooltip text={HELP_TEXT.midTier} />
                  </label>
                  <input
                    type="number"
                    value={config.experience.companyTierMultipliers.midTier}
                    onChange={(e) => updateExperienceCompany('midTier', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="1"
                    step="0.05"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                    Small Tech
                    <Tooltip text={HELP_TEXT.smallTech} />
                  </label>
                  <input
                    type="number"
                    value={config.experience.companyTierMultipliers.smallTech}
                    onChange={(e) => updateExperienceCompany('smallTech', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="1"
                    step="0.05"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                    Startup
                    <Tooltip text={HELP_TEXT.startup} />
                  </label>
                  <input
                    type="number"
                    value={config.experience.companyTierMultipliers.startup}
                    onChange={(e) => updateExperienceCompany('startup', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="1"
                    step="0.05"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                    Other
                    <Tooltip text={HELP_TEXT.otherCompany} />
                  </label>
                  <input
                    type="number"
                    value={config.experience.companyTierMultipliers.other}
                    onChange={(e) => updateExperienceCompany('other', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="1"
                    step="0.05"
                  />
                </div>
              </div>
            </div>

            {/* Duration Thresholds */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">{t('methodology.durationScoring')}</h3>
              <div className="space-y-3">
                {Object.entries(config.experience.durationThresholds).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-3 gap-4 items-center">
                    <div className="text-sm font-medium text-gray-300 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">{t('methodology.months')}</label>
                      <input
                        type="number"
                        value={value.months}
                        onChange={(e) => updateExperienceDuration(key as any, 'months', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="1"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">{t('methodology.points')}</label>
                      <input
                        type="number"
                        value={value.points}
                        onChange={(e) => updateExperienceDuration(key as any, 'points', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="0"
                        max="10"
                        step="0.5"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recency Bonus */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">{t('methodology.recencyBonusPenalty')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                    {t('methodology.currentPosition')}
                    <Tooltip text={HELP_TEXT.current} />
                  </label>
                  <input
                    type="number"
                    value={config.experience.recencyBonus.current}
                    onChange={(e) => updateExperienceRecency('current', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    step="0.5"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                    {t('methodology.within1Year')}
                    <Tooltip text={HELP_TEXT.recent1Year} />
                  </label>
                  <input
                    type="number"
                    value={config.experience.recencyBonus.recent1Year}
                    onChange={(e) => updateExperienceRecency('recent1Year', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    step="0.5"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                    {t('methodology.within2Years')}
                    <Tooltip text={HELP_TEXT.recent2Years} />
                  </label>
                  <input
                    type="number"
                    value={config.experience.recencyBonus.recent2Years}
                    onChange={(e) => updateExperienceRecency('recent2Years', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    step="0.5"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                    {t('methodology.yearsAgo')}
                    <Tooltip text={HELP_TEXT.old5YearsPlus} />
                  </label>
                  <input
                    type="number"
                    value={config.experience.recencyBonus.old5YearsPlus}
                    onChange={(e) => updateExperienceRecency('old5YearsPlus', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    step="0.5"
                  />
                </div>
              </div>
            </div>

            {/* Other Experience Parameters */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                  {t('methodology.roleRelevanceMaxPoints')}
                  <Tooltip text={HELP_TEXT.roleRelevanceMax} />
                </label>
                <input
                  type="number"
                  value={config.experience.roleRelevanceMax}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    experience: { ...prev.experience, roleRelevanceMax: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="15"
                  step="0.5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                  {t('methodology.multipleExperienceBonus')}
                  <Tooltip text={HELP_TEXT.multipleExperienceBonus} />
                </label>
                <input
                  type="number"
                  value={config.experience.multipleExperienceBonus}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    experience: { ...prev.experience, multipleExperienceBonus: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="5"
                  step="0.5"
                />
              </div>
            </div>
          </div>

          {/* Technical Skills Parameters */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-green-600/20 rounded-lg">
                <FiTool className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{t('methodology.technicalSkillsScoring')}</h2>
                <p className="text-sm text-gray-400">{t('methodology.requiredSkillMatching')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                  {t('methodology.matchingRequiredSkillsPoints')}
                  <Tooltip text={HELP_TEXT.matchingRequiredSkills} />
                </label>
                <input
                  type="number"
                  value={config.technicalSkills.matchingRequiredSkills}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    technicalSkills: { ...prev.technicalSkills, matchingRequiredSkills: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500"
                  min="0"
                  max="25"
                  step="1"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                  {t('methodology.depthBonusPoints')}
                  <Tooltip text={HELP_TEXT.depthBonus} />
                </label>
                <input
                  type="number"
                  value={config.technicalSkills.depthBonus}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    technicalSkills: { ...prev.technicalSkills, depthBonus: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500"
                  min="0"
                  max="10"
                  step="1"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                  {t('methodology.minSkillsForDepthBonus')}
                  <Tooltip text={HELP_TEXT.minSkillsForDepth} />
                </label>
                <input
                  type="number"
                  value={config.technicalSkills.minSkillsForDepth}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    technicalSkills: { ...prev.technicalSkills, minSkillsForDepth: parseInt(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500"
                  min="0"
                  max="20"
                  step="1"
                />
              </div>
            </div>
          </div>

          {/* Projects Parameters */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-purple-600/20 rounded-lg">
                <FiBox className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{t('methodology.projectsScoring')}</h2>
                <p className="text-sm text-gray-400">{t('methodology.basePointsRelevance')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                  {t('methodology.basePointsPerProject')}
                  <Tooltip text={HELP_TEXT.basePointsPerProject} />
                </label>
                <input
                  type="number"
                  value={config.projects.basePointsPerProject}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    projects: { ...prev.projects, basePointsPerProject: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500"
                  min="0"
                  max="15"
                  step="0.5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                  {t('methodology.maxProjectsCounted')}
                  <Tooltip text={HELP_TEXT.maxProjects} />
                </label>
                <input
                  type="number"
                  value={config.projects.maxProjects}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    projects: { ...prev.projects, maxProjects: parseInt(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500"
                  min="1"
                  max="5"
                  step="1"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                  {t('methodology.relevanceBonus')}
                  <Tooltip text={HELP_TEXT.relevanceBonus} />
                </label>
                <input
                  type="number"
                  value={config.projects.relevanceBonus}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    projects: { ...prev.projects, relevanceBonus: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500"
                  min="0"
                  max="10"
                  step="0.5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                  {t('methodology.noMatchPenalty')}
                  <Tooltip text={HELP_TEXT.noMatchPenalty} />
                </label>
                <input
                  type="number"
                  value={config.projects.noMatchPenalty}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    projects: { ...prev.projects, noMatchPenalty: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500"
                  min="-20"
                  max="0"
                  step="1"
                />
              </div>
            </div>
          </div>

          {/* Education Parameters */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-yellow-600/20 rounded-lg">
                <FiBook className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{t('methodology.educationScoring')}</h2>
                <p className="text-sm text-gray-400">{t('methodology.degreeLevelsCertifications')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                  {t('methodology.phdPoints')}
                  <Tooltip text={HELP_TEXT.phdPoints} />
                </label>
                <input
                  type="number"
                  value={config.education.phdPoints}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    education: { ...prev.education, phdPoints: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  min="0"
                  max="15"
                  step="0.5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                  {t('methodology.masterPoints')}
                  <Tooltip text={HELP_TEXT.masterPoints} />
                </label>
                <input
                  type="number"
                  value={config.education.masterPoints}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    education: { ...prev.education, masterPoints: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  min="0"
                  max="15"
                  step="0.5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                  {t('methodology.bachelorPoints')}
                  <Tooltip text={HELP_TEXT.bachelorPoints} />
                </label>
                <input
                  type="number"
                  value={config.education.bachelorPoints}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    education: { ...prev.education, bachelorPoints: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  min="0"
                  max="15"
                  step="0.5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                  {t('methodology.maxEducationScore')}
                  <Tooltip text={HELP_TEXT.maxEducationScore} />
                </label>
                <input
                  type="number"
                  value={config.education.maxEducationScore}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    education: { ...prev.education, maxEducationScore: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  min="0"
                  max="15"
                  step="0.5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                  {t('methodology.certificationBonus')}
                  <Tooltip text={HELP_TEXT.certificationBonus} />
                </label>
                <input
                  type="number"
                  value={config.education.certificationBonus}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    education: { ...prev.education, certificationBonus: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  min="0"
                  max="5"
                  step="0.5"
                />
              </div>
            </div>
          </div>

          {/* Signal Parameters */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-orange-600/20 rounded-lg">
                <FiZap className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{t('methodology.signalConsistencyScoring')}</h2>
                <p className="text-sm text-gray-400">{t('methodology.overallProfileQuality')}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                {t('methodology.maxScore')}
                <Tooltip text={HELP_TEXT.maxScore} />
              </label>
              <input
                type="number"
                value={config.signal.maxScore}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  signal: { maxScore: parseFloat(e.target.value) || 0 }
                }))}
                className="w-full max-w-xs px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500"
                min="0"
                max="15"
                step="1"
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-indigo-900/20 border border-indigo-700 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <FiInfo className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-1" />
              <div className="space-y-2 text-sm text-gray-300">
                <p className="font-semibold text-indigo-300">{t('methodology.howToUse')}</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>{t('methodology.adjustParameter')}</li>
                  <li>{t('methodology.weightsMustTotal')}</li>
                  <li>{t('methodology.changesSaved')}</li>
                  <li>{t('methodology.resetToDefault')}</li>
                  <li>{t('methodology.rankingAPIUses')}</li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
