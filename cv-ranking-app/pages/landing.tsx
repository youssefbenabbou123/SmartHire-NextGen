'use client';

import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Sora, Space_Grotesk } from 'next/font/google';
import ColorBends from '@/components/ColorBends';
import Squares from '@/components/Squares';
import Aurora from '@/components/Aurora';
import { 
  FiZap, 
  FiCpu, 
  FiTarget, 
  FiTrendingUp, 
  FiAward,
  FiShield,
  FiArrowRight,
  FiCheckCircle,
  FiUsers,
  FiDatabase,
  FiBarChart2
} from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';

// Premium fonts
const sora = Sora({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

export default function Landing() {
  const { t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: FiCpu,
      title: 'AI-Powered Analysis',
      description: 'Advanced machine learning algorithms analyze every aspect of candidate profiles',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: FiTarget,
      title: 'Precision Matching',
      description: 'Match candidates to job requirements with unprecedented accuracy',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: FiTrendingUp,
      title: 'Real-Time Insights',
      description: 'Get instant analytics and comprehensive candidate rankings',
      color: 'from-orange-500 to-red-500'
    }
  ];

  const stats = [
    { value: '10x', label: 'Faster Screening' },
    { value: '95%', label: 'Accuracy Rate' },
    { value: '1000+', label: 'CVs Processed' },
    { value: '24/7', label: 'AI Available' }
  ];

  return (
    <>
      <Head>
        <title>Smart Hire - AI-Powered Recruitment Platform</title>
        <meta name="description" content="Transform your hiring process with AI-powered CV analysis and intelligent candidate ranking" />
      </Head>

      <div className={`${sora.className} bg-black text-white overflow-x-hidden`}>
        {/* Full Background Behind Everything Including Navbar */}
        <div className="fixed top-0 left-0 w-full h-screen z-0 overflow-hidden">
          <ColorBends
            rotation={0}
            speed={0.2}
            colors={["#a4289a", "#1e00ff", "#001f7a"]}
            transparent={true}
            autoRotate={0}
            scale={1}
            frequency={1}
            warpStrength={1}
            mouseInfluence={1}
            parallax={0.5}
            noise={0.1}
          />
        </div>

        {/* Hero Section */}
        <section className="relative min-h-screen w-screen flex items-center justify-center px-6 overflow-hidden">
          {/* Content */}
          <div className="max-w-7xl mx-auto text-center space-y-10 relative z-10 -translate-y-10 md:-translate-y-16">
            
            {/* Animated Badge */}
            <div className="inline-flex items-center gap-3 px-8 py-4 bg-blue-500/10 border border-blue-500/30 rounded-full mb-8 animate-fade-in-up backdrop-blur-sm hover:scale-105 transition-transform">
              <img src="/Capgemini.png" alt="Capgemini" className="h-7 object-contain" />
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300 -translate-y-0.5">{t('landing.badge')}</span>
            </div>

            {/* Main Heading */}
            <h1 className={`${spaceGrotesk.className} text-7xl md:text-9xl font-black leading-tight animate-fade-in-up`} style={{ animationDelay: '0.1s' }}>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-white">
                {t('landing.heroTitle1')}
              </span>
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-gradient">
                {t('landing.heroTitle2')}
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-2xl md:text-3xl text-gray-400 max-w-3xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              {t('landing.heroSubtitle')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <Link href="/command-center">
                <button className="group px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-semibold text-lg shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 hover:scale-105 transition-all duration-300 flex items-center gap-3">
                  {t('landing.getStarted')}
                  <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link href="/methodology">
                <button className="px-10 py-5 bg-white/5 border border-white/10 rounded-2xl font-semibold text-lg hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-sm">
                  {t('landing.learnMore')}
                </button>
              </Link>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
              <div className="w-1.5 h-3 bg-white/50 rounded-full"></div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="relative py-32 px-6 overflow-hidden" style={{ backgroundColor: '#12022c' }}>
          {/* Squares Background */}
          <div className="absolute inset-0 w-full h-full">
            <Squares
              speed={0.2}
              squareSize={55}
              direction="diagonal"
              borderColor="#491c97"
              hoverFillColor="#12022c"
            />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className={`${spaceGrotesk.className} text-5xl md:text-6xl font-black mb-6`}>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                  {t('landing.howItWorks')}
                </span>
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                {t('landing.howItWorksSubtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: '01',
                  icon: FiDatabase,
                  title: t('landing.step1Title'),
                  description: t('landing.step1Desc')
                },
                {
                  step: '02',
                  icon: FiCpu,
                  title: t('landing.step2Title'),
                  description: t('landing.step2Desc')
                },
                {
                  step: '03',
                  icon: FiBarChart2,
                  title: t('landing.step3Title'),
                  description: t('landing.step3Desc')
                }
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="relative group opacity-0 animate-fadeInUp"
                    style={{
                      animationDelay: `${idx * 150}ms`,
                      animationFillMode: 'forwards'
                    }}
                  >
                    {idx < 2 && (
                      <div className="hidden md:block absolute top-20 left-full w-full h-0.5 bg-gradient-to-r from-blue-500/50 to-transparent -z-10"></div>
                    )}
                    <div className="glass-panel p-8 rounded-3xl border border-white/10 hover:border-blue-500/50 transition-all duration-500 h-full group-hover:scale-105">
                      <div className="text-6xl font-black text-purple-500/40 mb-4">{item.step}</div>
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mb-6 shadow-xl group-hover:shadow-blue-500/50 transition-shadow">
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-4 text-white">{item.title}</h3>
                      <p className="text-gray-400 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="relative py-32 px-6 overflow-hidden" style={{ backgroundColor: '#12022c' }}>
          {/* Squares Background */}
          <div className="absolute inset-0 w-full h-full">
            <Squares
              speed={0.2}
              squareSize={55}
              direction="diagonal"
              borderColor="#491c97"
              hoverFillColor="#12022c"
            />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className={`${spaceGrotesk.className} text-5xl md:text-6xl font-black mb-6`}>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                  {t('landing.powerfulFeatures')}
                </span>
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                {t('landing.featuresSubtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: FiCheckCircle, title: t('landing.feature1'), desc: t('landing.feature1Desc') },
                { icon: FiTarget, title: t('landing.feature2'), desc: t('landing.feature2Desc') },
                { icon: FiAward, title: t('landing.feature3'), desc: t('landing.feature3Desc') },
                { icon: FiUsers, title: t('landing.feature4'), desc: t('landing.feature4Desc') },
                { icon: FiShield, title: t('landing.feature5'), desc: t('landing.feature5Desc') },
                { icon: FiZap, title: t('landing.feature6'), desc: t('landing.feature6Desc') }
              ].map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={idx}
                    className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all duration-300 group hover:scale-105 opacity-0 animate-fadeInUp"
                    style={{
                      animationDelay: `${idx * 100}ms`,
                      animationFillMode: 'forwards'
                    }}
                  >
                    <Icon className="w-10 h-10 text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
                    <h3 className="text-xl font-bold mb-2 text-white">{feature.title}</h3>
                    <p className="text-gray-400 text-sm">{feature.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-32 px-6 overflow-hidden" style={{ backgroundColor: '#12022c' }}>
          {/* Aurora Background */}
          <div className="absolute inset-0 w-full h-full">
            <Aurora
              colorStops={['#3b82f6', '#8b5cf6', '#ec4899', '#6366f1']}
              speed={0.001}
              blur={80}
            />
          </div>
          <div className="relative z-10 max-w-5xl mx-auto text-center glass-panel p-16 rounded-3xl border border-white/10 overflow-hidden group">
            {/* Animated gradient background */}
            <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-gradient"></div>
            </div>

            {/* Animated floating elements */}
            <div className="absolute top-10 left-10 w-20 h-20 bg-blue-500/20 rounded-full blur-2xl animate-pulse opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute bottom-10 right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl animate-float opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-pink-500/15 rounded-full blur-2xl animate-pulse opacity-0 group-hover:opacity-100 transition-opacity"></div>

            <div className="relative z-10">
              <h2 className={`${spaceGrotesk.className} text-5xl md:text-6xl font-black mb-6 animate-fadeInUp`}>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                  {t('landing.ctaTitle')}
                </span>
              </h2>
              <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                {t('landing.ctaSubtitle')}
              </p>
              <Link href="/command-center">
                <button className="group/btn px-12 py-5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-bold text-xl shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 hover:scale-105 transition-all duration-300 flex items-center gap-3 mx-auto animate-fadeInUp relative overflow-hidden" style={{ animationDelay: '0.2s' }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover/btn:opacity-20 -skew-x-12 group-hover/btn:translate-x-full transition-all duration-500"></div>
                  <span className="relative">{t('landing.startNow')}</span>
                  <FiArrowRight className="group-hover/btn:translate-x-1 transition-transform relative" />
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-12 px-6 bg-black/50">
          <div className="max-w-7xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src="/Capgemini.png" alt="Capgemini" className="h-8 object-contain" />
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                {t('nav.smartHire')}
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              {t('landing.footer')}
            </p>
          </div>
        </footer>
      </div>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
