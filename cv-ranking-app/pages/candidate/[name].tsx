import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  FiArrowLeft,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiBriefcase,
  FiBook,
  FiCode,
  FiBox,
  FiAward,
  FiGlobe,
  FiHeart,
  FiCalendar,
  FiDownload,
  FiClock,
  FiStar,
  FiChevronRight,
  FiLinkedin,
  FiGithub,
  FiExternalLink,
  FiLayers,
  FiCpu,
  FiDatabase,
  FiTool,
  FiPenTool,
  FiUsers,
  FiCheckCircle
} from 'react-icons/fi';

interface CandidateCV {
  candidate_name: string;
  personal_info?: {
    full_name?: string;
    location?: string;
    emails?: string[];
    phone?: string;
    social_handles?: string[];
  };
  experience?: Array<{
    period?: string;
    duration?: string;
    company?: string;
    role?: string;
    description?: string;
    technologies?: string[];
  }>;
  projects?: Array<{
    title?: string;
    type?: string;
    description?: string;
    technologies?: string[];
  }>;
  skills?: {
    programming_languages?: string[];
    frameworks?: string[];
    web_technologies?: string[];
    mobile_technologies?: string[];
    databases?: string[];
    devops_tools?: string[];
    data_science?: string[];
    modeling_design?: string[];
    soft_skills?: string[];
    other?: string[];
  };
  education?: Array<{
    degree?: string;
    institution?: string;
    location?: string;
    field?: string;
    period?: string;
    year?: string;
  }>;
  languages_spoken?: Array<{
    language?: string;
    level?: string;
  }>;
  certifications?: string[];
  interests?: string[];
  parsed_at?: string;
  created_at?: string;
}

// Skill category configuration - will be translated in component
const getSkillCategories = (t: (key: string) => string) => [
  { key: 'programming_languages', label: t('profile.programmingLanguages'), icon: FiCode, color: 'from-blue-500 to-cyan-400' },
  { key: 'frameworks', label: t('profile.frameworks'), icon: FiLayers, color: 'from-purple-500 to-pink-400' },
  { key: 'web_technologies', label: t('profile.webTechnologies'), icon: FiGlobe, color: 'from-green-500 to-emerald-400' },
  { key: 'mobile_technologies', label: t('profile.mobileTechnologies'), icon: FiCpu, color: 'from-orange-500 to-yellow-400' },
  { key: 'databases', label: t('profile.databases'), icon: FiDatabase, color: 'from-red-500 to-rose-400' },
  { key: 'devops_tools', label: t('profile.devopsTools'), icon: FiTool, color: 'from-indigo-500 to-violet-400' },
  { key: 'data_science', label: t('profile.dataScience'), icon: FiCpu, color: 'from-teal-500 to-cyan-400' },
  { key: 'modeling_design', label: t('profile.modelingDesign'), icon: FiPenTool, color: 'from-pink-500 to-fuchsia-400' },
  { key: 'soft_skills', label: t('profile.softSkills'), icon: FiUsers, color: 'from-amber-500 to-orange-400' },
  { key: 'other', label: t('profile.otherSkills'), icon: FiStar, color: 'from-slate-500 to-gray-400' },
];

export default function CandidateProfile() {
  const { t } = useLanguage();
  const router = useRouter();
  const { name } = router.query;
  const [cv, setCv] = useState<CandidateCV | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const skillCategories = getSkillCategories(t);

  useEffect(() => {
    if (!name) return;

    const fetchCV = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/get-cv?name=${encodeURIComponent(name as string)}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch CV');
        }

        const data = await response.json();
        setCv(data.cv);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchCV();
  }, [name]);

  const downloadCV = () => {
    if (!cv) return;
    const { candidate_name, parsed_at, created_at, ...cvData } = cv;
    const dataStr = JSON.stringify(cvData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cv.candidate_name || 'cv'}_profile.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTotalSkillsCount = () => {
    if (!cv?.skills) return 0;
    return Object.values(cv.skills).reduce((acc, arr) => acc + (arr?.length || 0), 0);
  };

  if (loading) {
    return (
      <>
      <Head>
        <title>{t('profile.loading')} - CV Ranking System</title>
      </Head>
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400 text-lg">{t('profile.loading')}</p>
          </div>
        </main>
      </>
    );
  }

  if (error || !cv) {
    return (
      <>
      <Head>
        <title>{t('profile.notFound')} - CV Ranking System</title>
      </Head>
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-center glass-panel p-12 rounded-2xl max-w-md">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiUser className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{t('profile.notFound')}</h1>
            <p className="text-gray-400 mb-6">{error || t('profile.notFoundDesc')}</p>
            <Link
              href="/cvs"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold px-6 py-3 rounded-xl transition-all"
            >
              <FiArrowLeft className="w-5 h-5" />
              {t('profile.backToVault')}
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{cv.candidate_name || t('common.unknownCandidate')} - {t('profile.title')} | CV Ranking System</title>
        <meta name="description" content={`${t('profile.title')} - ${cv.candidate_name}`} />
      </Head>

      <main className="min-h-screen pb-20 relative overflow-hidden">
        {/* Animated Aurora Background */}
        <div className="aurora-bg"></div>
        
        {/* Decorative Elements */}
        <div className="fixed inset-0 -z-5 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-3xl"></div>
        </div>

        {/* Header Navigation */}
        <nav className="sticky top-0 z-50 glass-panel border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link
                href="/cvs"
                className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors group"
              >
                <div className="p-2 glass-card rounded-lg group-hover:bg-white/10 transition-colors">
                  <FiArrowLeft className="w-5 h-5" />
                </div>
                <span className="font-medium">{t('profile.backToVault')}</span>
              </Link>
              <button
                onClick={downloadCV}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl text-white font-medium transition-all hover:scale-105"
              >
                <FiDownload className="w-4 h-4" />
                {t('profile.exportJSON')}
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {/* Hero Section - Candidate Header */}
          <section className="mb-12 animate-fade-in-up">
            <div className="glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-500/20 to-transparent rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-500/20 to-transparent rounded-full blur-2xl"></div>
              </div>

              <div className="relative flex flex-col md:flex-row gap-8 items-start md:items-center">
                {/* Avatar */}
                <div className="relative group">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-4xl md:text-5xl font-bold shadow-2xl shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-shadow">
                    {getInitials(cv.candidate_name || cv.personal_info?.full_name || 'C')}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center border-4 border-[#0a0a0f]">
                    <FiCheckCircle className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* Name & Contact Info */}
                <div className="flex-1">
                  <h1 className="text-4xl md:text-5xl font-bold text-gradient-primary mb-4">
                    {cv.candidate_name || cv.personal_info?.full_name || t('common.unknownCandidate')}
                  </h1>
                  
                  <div className="flex flex-wrap gap-4 text-gray-300">
                    {cv.personal_info?.location && (
                      <div className="flex items-center gap-2">
                        <FiMapPin className="w-4 h-4 text-indigo-400" />
                        <span>{cv.personal_info.location}</span>
                      </div>
                    )}
                    {cv.personal_info?.emails?.[0] && (
                      <a href={`mailto:${cv.personal_info.emails[0]}`} className="flex items-center gap-2 hover:text-indigo-400 transition-colors">
                        <FiMail className="w-4 h-4 text-indigo-400" />
                        <span>{cv.personal_info.emails[0]}</span>
                      </a>
                    )}
                    {cv.personal_info?.phone && (
                      <a href={`tel:${cv.personal_info.phone}`} className="flex items-center gap-2 hover:text-indigo-400 transition-colors">
                        <FiPhone className="w-4 h-4 text-indigo-400" />
                        <span>{cv.personal_info.phone}</span>
                      </a>
                    )}
                  </div>

                  {/* Quick Stats */}
                  <div className="flex flex-wrap gap-4 mt-6">
                    <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-2">
                      <FiBriefcase className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-semibold">{cv.experience?.length || 0}</span>
                      <span className="text-gray-400 text-sm">{t('profile.experiences')}</span>
                    </div>
                    <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-2">
                      <FiBox className="w-4 h-4 text-green-400" />
                      <span className="text-white font-semibold">{cv.projects?.length || 0}</span>
                      <span className="text-gray-400 text-sm">{t('profile.projects')}</span>
                    </div>
                    <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-2">
                      <FiCode className="w-4 h-4 text-purple-400" />
                      <span className="text-white font-semibold">{getTotalSkillsCount()}</span>
                      <span className="text-gray-400 text-sm">{t('cvs.skills')}</span>
                    </div>
                    <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-2">
                      <FiAward className="w-4 h-4 text-yellow-400" />
                      <span className="text-white font-semibold">{cv.certifications?.length || 0}</span>
                      <span className="text-gray-400 text-sm">{t('profile.certifications')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Experience & Projects */}
            <div className="lg:col-span-2 space-y-8">
              {/* Experience Section */}
              {cv.experience && cv.experience.length > 0 && (
                <section className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl border border-blue-500/30">
                      <FiBriefcase className="w-6 h-6 text-blue-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">{t('profile.professionalExperience')}</h2>
                  </div>

                  <div className="space-y-4">
                    {cv.experience.map((exp, index) => (
                      <div
                        key={index}
                        className="glass-card rounded-2xl p-6 hover:border-blue-500/30 transition-all group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                              {exp.role || t('profile.position')}
                            </h3>
                            <p className="text-indigo-400 font-medium">{exp.company || t('profile.company')}</p>
                          </div>
                          {(exp.period || exp.duration) && (
                            <div className="flex items-center gap-2 text-sm text-gray-400 bg-white/5 px-3 py-1 rounded-full">
                              <FiCalendar className="w-3 h-3" />
                              <span>{exp.period}</span>
                              {exp.duration && <span>• {exp.duration}</span>}
                            </div>
                          )}
                        </div>

                        {exp.description && (
                          <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                            {exp.description}
                          </p>
                        )}

                        {exp.technologies && exp.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {exp.technologies.map((tech, techIndex) => (
                              <span
                                key={techIndex}
                                className="px-3 py-1 bg-blue-500/10 text-blue-300 text-xs font-medium rounded-full border border-blue-500/20"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Projects Section */}
              {cv.projects && cv.projects.length > 0 && (
                <section className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/30">
                      <FiBox className="w-6 h-6 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">{t('profile.projects')}</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cv.projects.map((project, index) => (
                      <div
                        key={index}
                        className="glass-card rounded-2xl p-6 hover:border-green-500/30 transition-all group"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="p-2 bg-green-500/20 rounded-lg">
                            <FiBox className="w-4 h-4 text-green-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors line-clamp-2">
                              {project.title || t('profile.projects')}
                            </h3>
                            {project.type && (
                              <span className="text-xs text-gray-400">{project.type}</span>
                            )}
                          </div>
                        </div>

                        {project.description && (
                          <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                            {project.description}
                          </p>
                        )}

                        {project.technologies && project.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {project.technologies.slice(0, 5).map((tech, techIndex) => (
                              <span
                                key={techIndex}
                                className="px-2 py-0.5 bg-green-500/10 text-green-300 text-xs rounded-full border border-green-500/20"
                              >
                                {tech}
                              </span>
                            ))}
                            {project.technologies.length > 5 && (
                              <span className="px-2 py-0.5 bg-white/5 text-gray-400 text-xs rounded-full">
                                +{project.technologies.length - 5} {t('profile.more')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Skills Section */}
              {cv.skills && Object.keys(cv.skills).length > 0 && (
                <section className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
                      <FiCode className="w-6 h-6 text-purple-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">{t('profile.skillsExpertise')}</h2>
                  </div>

                  <div className="glass-card rounded-2xl p-6 space-y-6">
                    {skillCategories.map((category) => {
                      const skills = cv.skills?.[category.key as keyof typeof cv.skills];
                      if (!skills || skills.length === 0) return null;

                      const Icon = category.icon;
                      return (
                        <div key={category.key}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`p-1.5 bg-gradient-to-r ${category.color} rounded-lg opacity-80`}>
                              <Icon className="w-3.5 h-3.5 text-white" />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-300">{category.label}</h3>
                            <span className="text-xs text-gray-500">({skills.length})</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {skills.map((skill, index) => (
                              <span
                                key={index}
                                className={`px-3 py-1.5 bg-gradient-to-r ${category.color} bg-opacity-10 text-white text-sm font-medium rounded-lg border border-white/10 hover:border-white/20 transition-colors`}
                                style={{
                                  background: `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)`,
                                }}
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

            {/* Right Column - Education, Languages, Certifications, Interests */}
            <div className="space-y-6">
              {/* Education Section */}
              {cv.education && cv.education.length > 0 && (
                <section className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl border border-amber-500/30">
                      <FiBook className="w-5 h-5 text-amber-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">{t('profile.education')}</h2>
                  </div>

                  <div className="glass-card rounded-2xl p-5 space-y-4">
                    {cv.education.map((edu, index) => (
                      <div
                        key={index}
                        className={`${index !== cv.education!.length - 1 ? 'pb-4 border-b border-white/5' : ''}`}
                      >
                        <h3 className="font-semibold text-white text-sm">
                          {edu.degree || t('profile.degree')}
                        </h3>
                        {edu.field && (
                          <p className="text-xs text-indigo-400">{edu.field}</p>
                        )}
                        {edu.institution && (
                          <p className="text-sm text-gray-400 mt-1">{edu.institution}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          {edu.location && (
                            <span className="flex items-center gap-1">
                              <FiMapPin className="w-3 h-3" />
                              {edu.location}
                            </span>
                          )}
                          {(edu.period || edu.year) && (
                            <span className="flex items-center gap-1">
                              <FiCalendar className="w-3 h-3" />
                              {edu.period || edu.year}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Languages Section */}
              {cv.languages_spoken && cv.languages_spoken.length > 0 && (
                <section className="animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30">
                      <FiGlobe className="w-5 h-5 text-cyan-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">{t('profile.languages')}</h2>
                  </div>

                  <div className="glass-card rounded-2xl p-5 space-y-3">
                    {cv.languages_spoken.map((lang, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-white font-medium text-sm">{lang.language}</span>
                        <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-full">
                          {lang.level || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Certifications Section */}
              {cv.certifications && cv.certifications.length > 0 && (
                <section className="animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl border border-yellow-500/30">
                      <FiAward className="w-5 h-5 text-yellow-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">{t('profile.certifications')}</h2>
                  </div>

                  <div className="glass-card rounded-2xl p-5 space-y-3">
                    {cv.certifications.map((cert, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="mt-1 w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0"></div>
                        <span className="text-gray-300 text-sm">{cert}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Interests Section */}
              {cv.interests && cv.interests.length > 0 && (
                <section className="animate-fade-in-up" style={{ animationDelay: '0.45s' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-gradient-to-r from-rose-500/20 to-pink-500/20 rounded-xl border border-rose-500/30">
                      <FiHeart className="w-5 h-5 text-rose-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">{t('profile.interests')}</h2>
                  </div>

                  <div className="glass-card rounded-2xl p-5">
                    <div className="flex flex-wrap gap-2">
                      {cv.interests.map((interest, index) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 bg-rose-500/10 text-rose-300 text-sm rounded-full border border-rose-500/20"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Parsed Info */}
              {cv.parsed_at && (
                <div className="glass-card rounded-xl p-4 text-center animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                    <FiClock className="w-3 h-3" />
                    <span>{t('profile.parsedOn')} {new Date(cv.parsed_at).toLocaleDateString('en-US', { 
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
