import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { useLanguage } from '../../contexts/LanguageContext';
import { FiArrowLeft, FiMapPin, FiClock, FiDollarSign, FiUsers, FiBookOpen, FiAward, FiCheckCircle, FiEdit2, FiTrash2, FiCalendar } from 'react-icons/fi';

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
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function JobDetailsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { id } = router.query;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchJob();
    }
  }, [id]);

  const fetchJob = async () => {
    try {
      const res = await fetch(`/api/jobs?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setJob(data);
      } else {
        router.push('/jobs');
      }
    } catch (error) {
      console.error('Failed to fetch job:', error);
      router.push('/jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('jobs.deleteConfirm'))) return;

    try {
      await fetch(`/api/jobs?id=${id}`, { method: 'DELETE' });
      router.push('/jobs');
    } catch (error) {
      console.error('Failed to delete job:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-24 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </>
    );
  }

  if (!job) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-24 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">{t('jobs.title')} {t('common.notFound')}</h2>
            <Link href="/jobs" className="text-blue-400 hover:underline">
              {t('common.back')} {t('jobs.title').toLowerCase()}
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{job.title} - Smart Hire</title>
      </Head>
      <Navbar />

      <div className="min-h-screen pt-24 pb-12 px-4">
        <div className="aurora-bg"></div>

        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link href="/jobs" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
            <FiArrowLeft /> {t('common.back')} {t('jobs.title')}
          </Link>

          {/* Header Card */}
          <div className="glass-panel rounded-2xl p-8 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{job.title}</h1>
                  {job.status === 'active' && (
                    <span className="px-3 py-1 text-sm font-medium bg-green-500/20 text-green-400 rounded-full">
                      {t('jobs.active')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <FiCalendar className="w-4 h-4" />
                  {t('common.posted')} {formatDate(job.createdAt)}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="p-3 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                  title={t('jobs.delete')}
                >
                  <FiTrash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {job.location && (
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <FiMapPin className="w-4 h-4" /> {t('common.location')}
                  </div>
                  <div className="text-white font-medium">{job.location}</div>
                </div>
              )}
              {job.employmentType && (
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <FiClock className="w-4 h-4" /> {t('common.type')}
                  </div>
                  <div className="text-white font-medium capitalize">{job.employmentType}</div>
                </div>
              )}
              {job.salary && (
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <FiDollarSign className="w-4 h-4" /> {t('common.salary')}
                  </div>
                  <div className="text-white font-medium">{job.salary}</div>
                </div>
              )}
              {job.experience && (
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <FiUsers className="w-4 h-4" /> {t('common.experience')}
                  </div>
                  <div className="text-white font-medium">{job.experience}</div>
                </div>
              )}
              {job.seniority && (
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <FiAward className="w-4 h-4" /> {t('common.seniority')}
                  </div>
                  <div className="text-white font-medium capitalize">{job.seniority}</div>
                </div>
              )}
              {job.education && (
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <FiBookOpen className="w-4 h-4" /> {t('common.education')}
                  </div>
                  <div className="text-white font-medium">{job.education}</div>
                </div>
              )}
            </div>
          </div>

          {/* Skills */}
          {job.skills && job.skills.length > 0 && (
            <div className="glass-panel rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                {t('common.requiredSkills')}
              </h2>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {job.description && (
            <div className="glass-panel rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                {t('common.jobDescription')}
              </h2>
              <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                {job.description}
              </div>
            </div>
          )}

          {/* Responsibilities */}
          {job.responsibilities && job.responsibilities.length > 0 && (
            <div className="glass-panel rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                {t('common.responsibilities')}
              </h2>
              <ul className="space-y-3">
                {job.responsibilities.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-300">
                    <FiCheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Requirements */}
          {job.requirements && job.requirements.length > 0 && (
            <div className="glass-panel rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                {t('common.requirements')}
              </h2>
              <ul className="space-y-3">
                {job.requirements.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-300">
                    <FiCheckCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Benefits */}
          {job.benefits && job.benefits.length > 0 && (
            <div className="glass-panel rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-pink-400 rounded-full"></span>
                {t('common.benefits')}
              </h2>
              <ul className="space-y-3">
                {job.benefits.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-300">
                    <FiCheckCircle className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Button */}
          <div className="mt-8 text-center">
            <Link 
              href={`/jobs/${job._id}/candidates`}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/20 hover:scale-105 hover:shadow-xl"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {t('common.findCandidatesForJob')}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
