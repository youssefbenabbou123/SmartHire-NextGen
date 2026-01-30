import { FiGithub, FiLinkedin, FiMail } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black/20 backdrop-blur-sm mt-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 block mb-4">
              Smart Hire
            </span>
            <p className="text-sm text-gray-400 max-w-xs mb-6">
              AI-powered recruitment platform for intelligent candidate evaluation and talent matching.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Product</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="/" className="hover:text-white transition-colors">Command Center</a></li>
              <li><a href="/recruiter" className="hover:text-white transition-colors">AI Recruiter</a></li>
              <li><a href="/dashboard" className="hover:text-white transition-colors">Analytics Hub</a></li>
              <li><a href="/cvs" className="hover:text-white transition-colors">Candidate Vault</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Resources</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="/methodology" className="hover:text-white transition-colors">Methodology</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/5 pt-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            
            {/* Left: Copyright */}
            <div className="flex flex-col gap-3">
              <p className="text-xs text-gray-500">
                © 2026 Smart Hire. All rights reserved. | Built with Next.js, TypeScript & TailwindCSS
              </p>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-600 px-3 py-1.5 rounded bg-white/5 border border-white/10">
                  🔒 Enterprise Grade | 🤖 AI-Powered | 🎯 Production Ready
                </span>
              </div>
            </div>

            {/* Right: Social & Status */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <a href="#" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                  <FiLinkedin className="w-4 h-4" />
                </a>
                <a href="#" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                  <FiGithub className="w-4 h-4" />
                </a>
                <a href="#" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                  <FiMail className="w-4 h-4" />
                </a>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                LIVE
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background gradient accent */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-t from-blue-600/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10"></div>
    </footer>
  );
}
