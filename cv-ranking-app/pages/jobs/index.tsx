import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { FiPlus, FiBriefcase, FiMapPin, FiClock, FiDollarSign, FiUsers, FiTrash2, FiChevronRight } from 'react-icons/fi';
import { useLanguage } from '../../contexts/LanguageContext';

interface Job {
  _id: string;
  title: string;
  description: string;
  skills: string[];
  experience: string | null;
  education: string | null;
  employmentType: string | null;
  location: string | null;
  salary: string | null;
  seniority: string | null;
  status: string;
  createdAt: string;
}

export default function JobsPage() {
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [newJob, setNewJob] = useState({ title: '', description: '' });
  const [parsedData, setParsedData] = useState<any>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleParseJob = async () => {
    if (!newJob.title && !newJob.description) return;
    
    setParsing(true);
    try {
      const res = await fetch('/api/parse-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJob),
      });
      const data = await res.json();
      if (data.parsedData) {
        setParsedData(data.parsedData);
      }
    } catch (error) {
      console.error('Failed to parse job:', error);
    } finally {
      setParsing(false);
    }
  };

  const handleCreateJob = async () => {
    if (!newJob.title) return;
    
    setCreating(true);
    try {
      // Parse first if not already parsed
      let finalParsedData = parsedData;
      if (!finalParsedData) {
        const parseRes = await fetch('/api/parse-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newJob),
        });
        const parseData = await parseRes.json();
        finalParsedData = parseData.parsedData;
      }

      // Create the job
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newJob,
          parsedData: finalParsedData,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewJob({ title: '', description: '' });
        setParsedData(null);
        fetchJobs();
      }
    } catch (error) {
      console.error('Failed to create job:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteJob = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm(t('jobs.deleteConfirm'))) return;

    try {
      await fetch(`/api/jobs?id=${id}`, { method: 'DELETE' });
      fetchJobs();
    } catch (error) {
      console.error('Failed to delete job:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
      <Head>
        <title>{t('jobs.title')} - Smart Hire</title>
      </Head>

      <div className="min-h-screen pt-24 pb-12 px-4">
        <div className="aurora-bg"></div>

        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{t('jobs.title')}</h1>
              <p className="text-gray-400">{t('jobs.subtitle')}</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20"
            >
              <FiPlus className="w-5 h-5" />
              {t('jobs.createJob')}
            </button>
          </div>

          {/* Jobs Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-gray-800 flex items-center justify-center mb-4">
                <FiBriefcase className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{t('jobs.noJobs')}</h3>
              <p className="text-gray-400 mb-6">{t('jobs.noJobsDesc')}</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all"
              >
                <FiPlus /> {t('jobs.createFirstJob')}
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {jobs.map((job) => (
                <Link href={`/jobs/${job._id}`} key={job._id}>
                  <div className="glass-card rounded-2xl p-6 cursor-pointer group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {job.title}
                          </h3>
                          {job.status === 'active' && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded-full">
                              {t('jobs.active')}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <FiMapPin className="w-4 h-4" /> {job.location}
                            </span>
                          )}
                          {job.employmentType && (
                            <span className="flex items-center gap-1">
                              <FiClock className="w-4 h-4" /> {job.employmentType}
                            </span>
                          )}
                          {job.salary && (
                            <span className="flex items-center gap-1">
                              <FiDollarSign className="w-4 h-4" /> {job.salary}
                            </span>
                          )}
                          {job.experience && (
                            <span className="flex items-center gap-1">
                              <FiUsers className="w-4 h-4" /> {job.experience}
                            </span>
                          )}
                        </div>

                        {job.skills && job.skills.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {job.skills.slice(0, 8).map((skill, i) => (
                              <span
                                key={i}
                                className="px-3 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full"
                              >
                                {skill}
                              </span>
                            ))}
                            {job.skills.length > 8 && (
                              <span className="px-3 py-1 text-xs font-medium bg-gray-700/50 text-gray-400 rounded-full">
                                +{job.skills.length - 8} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-xs text-gray-500">{formatDate(job.createdAt)}</span>
                        <button
                          onClick={(e) => handleDeleteJob(job._id, e)}
                          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                        <FiChevronRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Job Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-2xl font-bold text-white">{t('jobs.createNewJobPosting')}</h2>
              <p className="text-gray-400 mt-1">{t('jobs.aiExtractInfo')}</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Job Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('jobs.jobTitleRequired')}
                </label>
                <input
                  type="text"
                  value={newJob.title}
                  onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                  placeholder={t('jobs.jobTitlePlaceholder')}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              {/* Job Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('jobs.jobDescription')}
                </label>
                <textarea
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  placeholder={t('jobs.jobDescriptionPlaceholder')}
                  rows={8}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                />
              </div>

              {/* Preview Button */}
              <button
                onClick={handleParseJob}
                disabled={parsing || (!newJob.title && !newJob.description)}
                className="w-full py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-400 rounded-xl font-medium transition-all disabled:opacity-50"
              >
                {parsing ? t('jobs.analyzingWithAI') : t('jobs.previewAIExtraction')}
              </button>

              {/* Parsed Preview */}
              {parsedData && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    {t('jobs.aiExtractedInformation')}
                  </h4>
                  
                  {parsedData.skills?.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-400">{t('jobs.skills')}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {parsedData.skills.map((s: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {parsedData.experience && (
                      <div>
                        <span className="text-gray-400">{t('jobs.experience')}</span>
                        <span className="text-white ml-2">{parsedData.experience}</span>
                      </div>
                    )}
                    {parsedData.employmentType && (
                      <div>
                        <span className="text-gray-400">{t('jobs.type')}</span>
                        <span className="text-white ml-2">{parsedData.employmentType}</span>
                      </div>
                    )}
                    {parsedData.location && (
                      <div>
                        <span className="text-gray-400">{t('jobs.location')}</span>
                        <span className="text-white ml-2">{parsedData.location}</span>
                      </div>
                    )}
                    {parsedData.salary && (
                      <div>
                        <span className="text-gray-400">{t('jobs.salary')}</span>
                        <span className="text-white ml-2">{parsedData.salary}</span>
                      </div>
                    )}
                    {parsedData.seniority && (
                      <div>
                        <span className="text-gray-400">{t('jobs.seniority')}</span>
                        <span className="text-white ml-2">{parsedData.seniority}</span>
                      </div>
                    )}
                    {parsedData.education && (
                      <div>
                        <span className="text-gray-400">{t('jobs.education')}</span>
                        <span className="text-white ml-2">{parsedData.education}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/10 flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewJob({ title: '', description: '' });
                  setParsedData(null);
                }}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl font-medium transition-all"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreateJob}
                disabled={creating || !newJob.title}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
              >
                {creating ? t('jobs.creating') : t('jobs.createJobPosting')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
