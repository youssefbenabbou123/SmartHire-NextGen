import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { 
  FiHome, 
  FiDatabase,
  FiMessageSquare,
  FiSettings,
  FiMenu,
  FiX,
  FiBriefcase,
  FiClock,
  FiGlobe
} from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';

export default function RecruiterNavbar() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [ollamaRunning, setOllamaRunning] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Check Ollama status on mount and every 5 seconds
    const checkOllama = async () => {
      try {
        const response = await fetch('/api/check-ollama');
        const data = await response.json();
        setOllamaRunning(data.running || false);
      } catch (error) {
        setOllamaRunning(false);
      }
    };

    checkOllama();
    const interval = setInterval(checkOllama, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { href: '/command-center', label: t('nav.commandCenter'), icon: FiHome },
    { href: '/jobs', label: t('nav.jobs'), icon: FiBriefcase },
    { href: '/cvs', label: t('nav.cvVault'), icon: FiDatabase },
    { href: '/recruiter', label: t('nav.aiRecruiter'), icon: FiMessageSquare },
    { href: '/ranking-history', label: t('nav.history'), icon: FiClock },
    { href: '/methodology', label: t('nav.methodology'), icon: FiSettings },
  ];

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'fr' : 'en');
  };

  const isActive = (path: string) => {
    if (path === '/') return router.asPath === '/';
    // Use asPath for actual URL matching, handle exact matches and sub-routes
    return router.asPath === path || router.asPath.startsWith(path + '/');
  };

  return (
    <>
      <div className={`fixed top-0 left-0 w-full z-[100] transition-all duration-300 ${scrolled ? 'py-2' : 'py-4'}`}>
        <nav className={`max-w-[98%] xl:max-w-[1400px] mx-auto px-4 xl:px-6 transition-all duration-300 ${
          scrolled 
            ? 'backdrop-blur-xl border border-white/10 rounded-full mx-2 sm:mx-auto bg-white/10' 
            : 'bg-transparent border-transparent'
        }`}>
          <div className="flex items-center h-14 gap-2">
            
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 xl:gap-3 group flex-shrink-0">
              <img 
                src="/Capgemini.png" 
                alt="Capgemini" 
                className="h-9 xl:h-10 object-contain group-hover:scale-105 transition-transform duration-300"
              />
              <span className="text-xl xl:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 group-hover:to-white transition-all -translate-y-0.5 group-hover:scale-105 group-hover:-translate-y-1 whitespace-nowrap">
                {t('nav.smartHire')}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex flex-1 justify-center">
              <div className="flex items-center px-2 bg-white/10 rounded-full border border-white/10 backdrop-blur-sm">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-1.5 xl:gap-2 px-3 xl:px-4 py-2 rounded-full font-medium text-xs xl:text-sm transition-all duration-300 whitespace-nowrap ${
                      active
                        ? 'text-white bg-white/15 shadow-inner'
                        : 'text-gray-400 hover:text-white hover:bg-white/8'
                    }`}
                  >
                    <Icon className={`w-3.5 xl:w-4 h-3.5 xl:h-4 ${active ? 'text-blue-400' : 'text-gray-400'}`} />
                    <span>{item.label}</span>
                    {active && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full mb-1"></span>
                    )}
                  </Link>
                );
              })}
              </div>
            </div>

            {/* Right Action */}
            <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group"
                title={language === 'en' ? 'Switch to French' : 'Passer en anglais'}
              >
                <FiGlobe className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors" />
                <span className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors">
                  {language === 'en' ? 'FR' : 'EN'}
                </span>
              </button>
              
              <div className="h-8 w-[1px] bg-white/10"></div>
              <div className="flex items-center gap-1.5 xl:gap-2 px-2 xl:px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                <span className={`w-2 h-2 rounded-full ${ollamaRunning ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-[10px] xl:text-xs text-blue-300 font-mono whitespace-nowrap">{t('nav.ollamaLive')}</span>
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-gray-300 hover:text-white transition-colors ml-auto"
            >
              {isMobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[90] bg-black/95 backdrop-blur-xl lg:hidden pt-24 px-6 animate-fade-in">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-4 px-6 py-4 rounded-xl font-medium text-lg border transition-all duration-300 ${
                    active
                      ? 'bg-blue-600/10 border-blue-500/30 text-white'
                      : 'border-white/5 text-gray-400 hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${active ? 'text-blue-400' : ''}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            
            {/* Mobile Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-4 px-6 py-4 rounded-xl font-medium text-lg border border-white/5 text-gray-400 hover:bg-white/5 transition-all duration-300 mt-4"
            >
              <FiGlobe className="w-6 h-6" />
              <span>{language === 'en' ? 'Français' : 'English'}</span>
              <span className="ml-auto px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold">
                {language.toUpperCase()}
              </span>
            </button>
          </div>
        </div>
      )}
      
      {/* Spacer for fixed navbar */}
      <div className="h-24"></div>
    </>
  );
}
