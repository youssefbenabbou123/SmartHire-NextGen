import Head from 'next/head';
import { 
  FiTarget, 
  FiBarChart2, 
  FiShield, 
  FiZap, 
  FiUsers, 
  FiCheckCircle,
  FiTrendingUp,
  FiCode,
  FiAward
} from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';

export default function About() {
  const { t } = useLanguage();
  const features = [
    {
      icon: FiBarChart2,
      title: t('about.structuredScoring'),
      description: t('about.structuredScoringDesc'),
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: FiShield,
      title: t('about.explainableResults'),
      description: t('about.explainableResultsDesc'),
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: FiZap,
      title: t('about.fastProcessing'),
      description: t('about.fastProcessingDesc'),
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: FiUsers,
      title: t('about.recruiterInspired'),
      description: t('about.recruiterInspiredDesc'),
      color: 'from-yellow-500 to-orange-500'
    },
    {
      icon: FiCode,
      title: t('about.technicalFocus'),
      description: t('about.technicalFocusDesc'),
      color: 'from-indigo-500 to-purple-500'
    },
    {
      icon: FiAward,
      title: t('about.qualityAssurance'),
      description: t('about.qualityAssuranceDesc'),
      color: 'from-red-500 to-pink-500'
    },
  ];

  const scoringBreakdown = [
    { category: t('about.experienceQuality'), weight: t('about.experienceQualityWeight'), description: t('about.experienceQualityDesc') },
    { category: t('about.technicalSkills'), weight: t('about.technicalSkillsWeight'), description: t('about.technicalSkillsDesc') },
    { category: t('about.projectsImpact'), weight: t('about.projectsImpactWeight'), description: t('about.projectsImpactDesc') },
    { category: t('about.educationCertifications'), weight: t('about.educationCertificationsWeight'), description: t('about.educationCertificationsDesc') },
    { category: t('about.signalConsistency'), weight: t('about.signalConsistencyWeight'), description: t('about.signalConsistencyDesc') },
  ];

  return (
    <>
      <Head>
        <title>{t('about.title')} - CV Ranking System</title>
        <meta name="description" content={t('about.subtitle')} />
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
          <div className="text-center mb-16 animate-fade-in-up">
            <div className="inline-block mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur-2xl opacity-50"></div>
                <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-full">
                  <FiTarget className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-4 gradient-text">
              {t('about.aboutCVRanking')}
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              {t('about.sophisticatedPlatform')} 
              <span className="text-indigo-400 font-semibold"> {t('about.informatique')}</span> {t('about.positions')}
            </p>
          </div>

          {/* Mission Section */}
          <div className="glass-strong rounded-2xl shadow-2xl p-8 mb-12 animate-fade-in-up glow-hover">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-lg border border-indigo-500/30">
                <FiTarget className="w-6 h-6 text-indigo-400" />
              </div>
              <h2 className="text-3xl font-bold text-white">{t('about.ourMission')}</h2>
            </div>
            <p className="text-gray-300 text-lg leading-relaxed mb-4">
              {t('about.missionText1')}
            </p>
            <p className="text-gray-400 leading-relaxed">
              {t('about.missionText2')}
            </p>
          </div>

          {/* Features Grid */}
          <div className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-white mb-3">{t('about.keyFeatures')}</h2>
              <p className="text-gray-400">{t('about.whatMakesUnique')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="glass rounded-xl p-6 border border-white/10 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:scale-105 animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className={`mb-4 p-3 bg-gradient-to-r ${feature.color} rounded-lg w-fit`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scoring Breakdown */}
          <div className="glass-strong rounded-2xl shadow-2xl p-8 mb-12 animate-fade-in-up glow-hover">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-lg border border-indigo-500/30">
                <FiTrendingUp className="w-6 h-6 text-indigo-400" />
              </div>
              <h2 className="text-3xl font-bold text-white">{t('about.scoringMethodology')}</h2>
            </div>
            <div className="space-y-4">
              {scoringBreakdown.map((item, index) => (
                <div
                  key={index}
                  className="glass p-5 rounded-xl border border-white/10 hover:border-indigo-500/30 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-lg">
                        <FiCheckCircle className="w-5 h-5 text-indigo-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white">{item.category}</h3>
                    </div>
                    <span className="text-indigo-400 font-bold text-lg">{item.weight}</span>
                  </div>
                  <p className="text-gray-400 ml-12">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div className="glass-strong rounded-2xl shadow-2xl p-8 animate-fade-in-up glow-hover">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-lg border border-indigo-500/30">
                <FiZap className="w-6 h-6 text-indigo-400" />
              </div>
              <h2 className="text-3xl font-bold text-white">{t('about.howItWorks')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full mb-4 text-white text-2xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{t('about.uploadCVs')}</h3>
                <p className="text-gray-400">
                  {t('about.uploadCVsDesc')}
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mb-4 text-white text-2xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{t('about.defineRequirements')}</h3>
                <p className="text-gray-400">
                  {t('about.defineRequirementsDesc')}
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-pink-600 to-red-600 rounded-full mb-4 text-white text-2xl font-bold">
                  3
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{t('about.getRankings')}</h3>
                <p className="text-gray-400">
                  {t('about.getRankingsDesc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}