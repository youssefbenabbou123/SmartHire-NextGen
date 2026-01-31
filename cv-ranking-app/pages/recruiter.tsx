'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { Sora } from 'next/font/google';
import RecruiterNavbar from '../components/RecruiterNavbar';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  FiSend, FiUser, FiCpu, FiZap, FiMessageSquare,
  FiUsers, FiPercent, FiChevronDown, FiChevronUp, FiPlus, 
  FiTrash2, FiStopCircle, FiMenu, FiX, FiSearch, FiStar, FiCheck,
  FiChevronRight, FiCode, FiBriefcase, FiAward, FiRefreshCw, FiMic
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';

const sora = Sora({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  candidates?: any[];
  similarityScores?: any[];
  usedMistral?: boolean;
  isTyping?: boolean;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface Candidate {
  name: string;
  score: number;
  skills?: string[];
  experience?: any[];
  projects?: any[];
  matchScore?: number;
  matchDetails?: any;
}

// Helper function to get candidate name from different possible fields
function getCandidateName(candidate: any): string {
  return candidate.candidate_name || candidate.name || candidate.raw_data?.personal_info?.full_name || 'Unknown';
}

// Helper function for toast notifications
const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  const toast = document.createElement('div');
  const colors = {
    success: 'text-green-400',
    error: 'text-red-400',
    info: 'text-blue-400'
  };
  toast.className = `fixed top-20 right-6 bg-[#16161d] border border-white/10 rounded-xl px-4 py-3 shadow-2xl z-50 animate-fade-in-up ${colors[type]}`;
  toast.innerHTML = `
    <div class="flex items-center gap-2">
      <span class="text-white">${message}</span>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

export default function RecruiterPage() {
  const { t, language } = useLanguage();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [typingText, setTypingText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [baseInput, setBaseInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const interimTranscriptRef = useRef<string>('');
  const baseInputRef = useRef<string>('');

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Keep listening until manually stopped
        recognition.interimResults = true;
        
        // Set language based on user preference - update dynamically
        const langCode = language === 'fr' ? 'fr-FR' : 'en-US';
        recognition.lang = langCode;

        recognition.onresult = (event: any) => {
          let currentInterim = '';
          let currentFinal = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              currentFinal += transcript + ' ';
            } else {
              currentInterim += transcript;
            }
          }

          // Update refs for access in callbacks
          const currentBase = baseInputRef.current;

          // Update interim transcript for real-time display
          if (currentInterim) {
            interimTranscriptRef.current = currentInterim;
            setInterimTranscript(currentInterim);
            // Show interim results in real-time
            setInput(currentBase + currentInterim);
          } else {
            interimTranscriptRef.current = '';
            setInterimTranscript('');
          }

          // Update base input with final transcript and clear interim
          if (currentFinal) {
            const newBase = (currentBase + currentFinal).trim();
            baseInputRef.current = newBase;
            setBaseInput(newBase);
            setInput(newBase);
            interimTranscriptRef.current = '';
            setInterimTranscript('');
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          // Don't stop recording on 'no-speech' errors in continuous mode
          if (event.error === 'no-speech') {
            // User paused speaking, keep listening - no error message needed
            return;
          }
          // Only stop on actual errors
          setIsRecording(false);
          if (event.error === 'not-allowed') {
            showToast(t('recruiter.microphonePermission'), 'error');
          } else if (event.error === 'network') {
            showToast('Network error. Please check your connection.', 'error');
          } else if (event.error === 'aborted') {
            // User manually stopped - this is expected
            return;
          } else {
            showToast(`Speech recognition error: ${event.error}`, 'error');
          }
        };

        recognition.onend = () => {
          // Only save if we were actually recording (user manually stopped)
          if (isRecording) {
            // Save any remaining interim transcript as final
            const currentInterim = interimTranscriptRef.current;
            const currentBase = baseInputRef.current;
            if (currentInterim.trim()) {
              const finalText = (currentBase + currentInterim).trim();
              baseInputRef.current = finalText;
              setBaseInput(finalText);
              setInput(finalText);
              interimTranscriptRef.current = '';
              setInterimTranscript('');
            }
            setIsRecording(false);
          }
        };

        setSpeechRecognition(recognition);
        recognitionRef.current = recognition;
        
        // Update language when it changes (if recognition is already created)
        return () => {
          if (recognitionRef.current) {
            recognitionRef.current.lang = language === 'fr' ? 'fr-FR' : 'en-US';
          }
        };
      }
    }
  }, [t, language]);
  
  // Update recognition language when language changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language === 'fr' ? 'fr-FR' : 'en-US';
    }
  }, [language]);

  // Load data on mount
  useEffect(() => {
    const loadCandidates = async () => {
      try {
        // ALWAYS load all CVs from database
        const response = await fetch('/api/get-cvs?limit=100');
        if (response.ok) {
          const data = await response.json();
          if (data.cvs && data.cvs.length > 0) {
            console.log(`📚 Loaded ${data.cvs.length} candidates from database`);
            
            // Try to enhance with ranking data from localStorage
            const stored = localStorage.getItem('cvRankings');
            let enhancedCandidates = data.cvs;
            
            if (stored) {
              try {
                const ranked = JSON.parse(stored);
                if (Array.isArray(ranked) && ranked.length > 0) {
                  // Merge ranking scores into the database candidates
                  enhancedCandidates = data.cvs.map((dbCandidate: any) => {
                    const rankedData = ranked.find((r: any) => 
                      getCandidateName(r) === getCandidateName(dbCandidate)
                    );
                    return rankedData || dbCandidate;
                  });
                  console.log(`✅ Enhanced ${enhancedCandidates.length} candidates with ranking data`);
                }
              } catch (e) {
                console.error('Failed to enhance with ranking data:', e);
                // Fall back to just database candidates
              }
            }
            
            setCandidates(enhancedCandidates);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to load CVs from database:', error);
      }
      
      // Fallback: Try to load just from localStorage if database fetch fails
      try {
        const stored = localStorage.getItem('cvRankings');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.length > 0) {
            console.log(`📚 Loaded ${parsed.length} candidates from localStorage (database unavailable)`);
            setCandidates(parsed);
            return;
          }
        }
      } catch (e) {
        console.error('Failed to parse rankings:', e);
      }
    };

    loadCandidates();

    const storedChats = localStorage.getItem('recruiterChats');
    if (storedChats) {
      try {
        const parsed = JSON.parse(storedChats);
        if (parsed.length > 0) {
          setChats(parsed);
          setCurrentChatId(parsed[0].id);
          setMessages(parsed[0].messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          })));
        } else {
          initializeNewChat();
        }
      } catch (e) {
        initializeNewChat();
      }
    } else {
      initializeNewChat();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingText]);

  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('recruiterChats', JSON.stringify(chats));
    }
  }, [chats]);

  const initializeNewChat = useCallback(() => {
    const candidateCount = JSON.parse(localStorage.getItem('cvRankings') || '[]').length;
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: `# ${t('recruiter.welcomeTitle')}

${t('recruiter.welcomeDesc')}

## ${t('recruiter.whatICanHelp')}:

${t('recruiter.searchCandidates')}
${t('recruiter.analyzeMatches')}
${t('recruiter.smartFilters')}
${t('recruiter.naturalLanguage')}

${candidateCount > 0 
  ? `\n✅ **${candidateCount} ${t('recruiter.candidatesLoaded')}` 
  : `\n⚠️ ${t('recruiter.noCandidatesLoaded')}`}

---

${t('recruiter.tryAsking')}`,
      timestamp: new Date(),
      usedMistral: true
    };

    const newChat: Chat = {
      id: Date.now().toString(),
      title: t('recruiter.newConversation'),
      messages: [welcomeMessage],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setChats([newChat]);
    setCurrentChatId(newChat.id);
    setMessages([welcomeMessage]);
  }, []);

  const createNewChat = () => {
    const candidateCount = candidates.length;
    const welcomeMessage: Message = {
      id: 'welcome-' + Date.now(),
      role: 'assistant',
      content: `# ${t('recruiter.newConversationStarted')}

${t('recruiter.readyToHelp')}

${candidateCount > 0 
  ? `📊 **${candidateCount} ${t('recruiter.candidatesAvailable')}` 
  : `⚠️ ${t('recruiter.uploadCVsToEnable')}`}

${t('recruiter.whatAreYouLookingFor')}`,
      timestamp: new Date(),
      usedMistral: true
    };

    const newChat: Chat = {
      id: Date.now().toString(),
      title: t('recruiter.newConversation'),
      messages: [welcomeMessage],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setMessages([welcomeMessage]);
  };

  const switchChat = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages.map(m => ({
        ...m,
        timestamp: new Date(m.timestamp)
      })));
    }
  };

  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = chats.filter(c => c.id !== chatId);
    setChats(updated);
    
    if (currentChatId === chatId) {
      if (updated.length > 0) {
        switchChat(updated[0].id);
      } else {
        createNewChat();
      }
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/recruiter-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          candidates,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || data.response || 'I apologize, but I couldn\'t process that request.',
        timestamp: new Date(),
        candidates: data.candidates,
        similarityScores: data.similarityScores,
        usedMistral: data.usedMistral !== false
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);

      // Update chat
      const title = newMessages.length <= 2 
        ? input.trim().substring(0, 35) + (input.length > 35 ? '...' : '')
        : chats.find(c => c.id === currentChatId)?.title || 'Conversation';

      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, title, messages: finalMessages, updatedAt: new Date() }
          : chat
      ));

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `${t('recruiter.connectionError')}

${t('recruiter.unableToReach')}

*${t('recruiter.error')} ${error.message}*`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleRecording = () => {
    if (!speechRecognition) {
      showToast(t('recruiter.noSpeechRecognition'), 'error');
      return;
    }

    if (isRecording) {
      // Stop recording - save any interim transcript
      const currentInterim = interimTranscriptRef.current;
      const currentBase = baseInputRef.current;
      if (currentInterim.trim()) {
        const finalText = (currentBase + currentInterim).trim();
        baseInputRef.current = finalText;
        setBaseInput(finalText);
        setInput(finalText);
        interimTranscriptRef.current = '';
        setInterimTranscript('');
      }
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      // Start recording - save current input as base
      baseInputRef.current = input;
      setBaseInput(input);
      interimTranscriptRef.current = '';
      setInterimTranscript('');
      try {
        // Set language right before starting to ensure it's correct
        if (recognitionRef.current) {
          recognitionRef.current.lang = language === 'fr' ? 'fr-FR' : 'en-US';
        }
        recognitionRef.current?.start();
        setIsRecording(true);
        showToast(t('recruiter.listening'), 'info');
      } catch (error: any) {
        console.error('Error starting speech recognition:', error);
        setIsRecording(false);
        if (error.name === 'NotAllowedError') {
          showToast(t('recruiter.microphonePermission'), 'error');
        } else {
          showToast('Failed to start recording', 'error');
        }
      }
    }
  };

  const toggleCardExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatMarkdown = (content: string) => {
    const lines = content.split('\n');
    
    return lines.map((line, i) => {
      // Headers
      if (line.startsWith('# ')) {
        return <h1 key={i} className="text-2xl font-bold mb-4 text-white">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-xl font-semibold mb-3 mt-4 text-white">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-lg font-semibold mb-2 mt-3 text-gray-100">{line.slice(4)}</h3>;
      }

      // Horizontal rule
      if (line.trim() === '---') {
        return <hr key={i} className="my-4 border-white/10" />;
      }

      // Format inline elements
      let formatted = line
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="text-gray-300">$1</em>')
        .replace(/`(.*?)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-blue-300 text-sm font-mono">$1</code>');

      // Bullet points
      if (line.match(/^[•\-\*]\s/)) {
        const text = line.replace(/^[•\-\*]\s/, '');
        return (
          <div key={i} className="flex items-start gap-2 mb-1 ml-2">
            <span className="text-blue-400 mt-1">•</span>
            <span dangerouslySetInnerHTML={{ __html: formatted.replace(/^[•\-\*]\s/, '') }} className="text-gray-300" />
          </div>
        );
      }

      // Numbered lists
      const numMatch = line.match(/^(\d+)\.\s/);
      if (numMatch) {
        return (
          <div key={i} className="flex items-start gap-2 mb-1 ml-2">
            <span className="text-blue-400 font-medium min-w-[20px]">{numMatch[1]}.</span>
            <span dangerouslySetInnerHTML={{ __html: formatted.replace(/^\d+\.\s/, '') }} className="text-gray-300" />
          </div>
        );
      }

      // Empty lines
      if (line.trim() === '') {
        return <div key={i} className="h-2" />;
      }

      // Regular paragraphs
      return <p key={i} className="text-gray-300 mb-1" dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  const renderCandidateCards = (candidateList: any[]) => {
    if (!candidateList || candidateList.length === 0) return null;

    return (
      <div className="mt-4 space-y-3">
        {candidateList.slice(0, 10).map((candidate, idx) => {
          const isExpanded = expandedCards.has(candidate.name + idx);
          const matchScore = candidate.matchScore || candidate.score || 0;
          const scoreColor = matchScore >= 70 ? 'from-green-500 to-emerald-600' 
            : matchScore >= 50 ? 'from-yellow-500 to-orange-500' 
            : 'from-gray-500 to-gray-600';

          return (
            <div 
              key={idx}
              className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl border border-white/10 overflow-hidden hover:border-white/20 transition-all duration-300"
            >
              {/* Card Header */}
              <div 
                className="p-4 cursor-pointer flex items-center justify-between"
                onClick={() => toggleCardExpand(candidate.name + idx)}
              >
                <div className="flex items-center gap-4">
                  {/* Rank Badge */}
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${scoreColor} flex items-center justify-center font-bold text-white shadow-lg`}>
                    {idx + 1}
                  </div>
                  
                  {/* Name & Skills Preview */}
                  <div>
                    <h4 className="font-semibold text-white text-lg">{candidate.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {candidate.skills?.slice(0, 3).map((skill: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                          {skill}
                        </span>
                      ))}
                      {candidate.skills?.length > 3 && (
                        <span className="text-gray-500 text-xs">+{candidate.skills.length - 3} {t('cc.more')}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Score & Expand */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={`text-2xl font-bold bg-gradient-to-r ${scoreColor} bg-clip-text text-transparent`}>
                      {Math.round(matchScore)}%
                    </div>
                    <div className="text-xs text-gray-500">{t('cc.matchScore')}</div>
                  </div>
                  <FiChevronDown className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-4">
                  {/* Skills Breakdown */}
                  {candidate.matchDetails?.skillMatch && (
                    <div>
                        <h5 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                        <FiCode size={14} /> {t('cc.skillsAnalysis')}
                      </h5>
                      <div className="space-y-2">
                        {/* Matched Skills */}
                        {candidate.matchDetails.skillMatch.matched?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {candidate.matchDetails.skillMatch.matched.map((m: any, i: number) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500/15 border border-green-500/30 text-green-400 text-xs rounded-lg">
                                <FiCheck size={10} />
                                {m.matched || m}
                                {m.similarity && <span className="opacity-60">({Math.round(m.similarity * 100)}%)</span>}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Missing Skills */}
                        {candidate.matchDetails.skillMatch.unmatched?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {candidate.matchDetails.skillMatch.unmatched.map((skill: string, i: number) => (
                              <span key={i} className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400/80 text-xs rounded-lg">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Experience & Projects */}
                  <div className="grid grid-cols-2 gap-4">
                    {candidate.experience?.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                          <FiBriefcase size={14} /> {t('cc.experience')}
                        </h5>
                        <div className="space-y-1">
                          {candidate.experience.slice(0, 2).map((exp: any, i: number) => (
                            <div key={i} className="text-xs text-gray-300">
                              {exp.title || exp.position} {exp.company && `@ ${exp.company}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {candidate.projects?.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                          <FiAward size={14} /> {t('cc.projects')}
                        </h5>
                        <div className="space-y-1">
                          {candidate.projects.slice(0, 2).map((proj: any, i: number) => (
                            <div key={i} className="text-xs text-gray-300">{proj.name || proj.title || proj}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const suggestions = [
    { icon: FiSearch, text: t('recruiter.findJavaDevelopers') },
    { icon: FiStar, text: t('recruiter.showTop5') },
    { icon: FiCode, text: t('recruiter.whoHasReact') },
    { icon: FiBriefcase, text: t('recruiter.findCandidatesWithExperience') }
  ];

  return (
    <>
      <Head>
        <title>{t('recruiter.title')} | Smart Hire</title>
      </Head>

      <div className={`${sora.className} flex flex-col h-screen bg-[#0a0a0f] text-white overflow-hidden`}>
        {/* Compact Navbar */}
        <RecruiterNavbar />
        
        {/* Main Layout */}
        <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-72' : 'w-0'} bg-[#111118] border-r border-white/5 flex flex-col transition-all duration-300 overflow-hidden`}>
          {/* Sidebar Header */}
          <div className="p-4 border-b border-white/5">
            <button
              onClick={createNewChat}
              className="w-full p-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            >
              <FiPlus size={18} />
              {t('recruiter.newChat')}
            </button>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
            {chats.map(chat => (
              <div
                key={chat.id}
                onClick={() => switchChat(chat.id)}
                className={`group p-3 rounded-xl cursor-pointer transition-all flex items-center gap-3 ${
                  currentChatId === chat.id 
                    ? 'bg-white/10 border border-white/10' 
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <FiMessageSquare size={16} className="text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-300 truncate">{chat.title}</div>
                  <div className="text-xs text-gray-600">{new Date(chat.updatedAt).toLocaleDateString()}</div>
                </div>
                <button
                  onClick={(e) => deleteChat(chat.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded-lg transition-all"
                >
                  <FiTrash2 size={14} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <FiUsers size={14} />
              </div>
              <div>
                <div className="text-sm font-medium">{candidates.length} {t('recruiter.candidates')}</div>
                <div className="text-xs text-gray-500">{t('recruiter.readyToSearch')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Small status bar with sidebar toggle */}
          <div className="h-10 border-b border-white/5 flex items-center px-3 bg-[#0d0d12]/50">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-all mr-3"
            >
              {sidebarOpen ? <FiX size={16} /> : <FiMenu size={16} />}
            </button>
            
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                {t('recruiter.aiRecruiter')}
              </span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-500">{candidates.length} {t('recruiter.candidates').toLowerCase()}</span>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
              {messages.map(message => (
                <div key={message.id} className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
                  {message.role === 'assistant' && (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                      <HiSparkles size={16} />
                    </div>
                  )}
                  
                  <div className={`flex-1 max-w-[85%] ${message.role === 'user' ? 'flex justify-end' : ''}`}>
                    <div className={`rounded-2xl px-5 py-4 ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white ml-auto'
                        : 'bg-[#16161d] border border-white/5'
                    }`}>
                      {/* Message Header */}
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          {message.role === 'user' ? (
                            <FiUser size={14} className="text-blue-200" />
                          ) : (
                            <FiCpu size={14} className="text-blue-400" />
                          )}
                          <span className="text-xs font-medium opacity-70">
                            {message.role === 'user' ? t('recruiter.you') : t('recruiter.aiRecruiter')}
                          </span>
                        </div>
                        <span className="text-xs opacity-40">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Message Content */}
                      <div className="prose prose-invert prose-sm max-w-none">
                        {formatMarkdown(message.content)}
                      </div>

                      {/* Candidate Cards */}
                      {message.candidates && message.candidates.length > 0 && renderCandidateCards(message.candidates)}
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center flex-shrink-0">
                      <FiUser size={16} />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading State */}
              {isLoading && (
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                    <HiSparkles size={16} className="animate-pulse" />
                  </div>
                  <div className="bg-[#16161d] border border-white/5 rounded-2xl px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                      <span className="text-sm text-gray-400">{t('recruiter.analyzing')}</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-white/5 bg-[#0d0d12]/80 backdrop-blur-xl p-4">
            <div className="max-w-4xl mx-auto">
              {/* Suggestions (only show when no messages or just welcome) */}
              {messages.length <= 1 && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(suggestion.text)}
                      className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-left flex items-center gap-3 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-all">
                        <suggestion.icon size={14} className="text-blue-400" />
                      </div>
                      <span className="text-sm text-gray-400 group-hover:text-gray-300">{suggestion.text}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Input Box */}
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('recruiter.askMeToFind')}
                  rows={1}
                  className="w-full px-5 py-4 pr-32 bg-[#16161d] border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 resize-none transition-all"
                  disabled={isLoading}
                  style={{ minHeight: '56px', maxHeight: '200px' }}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {isLoading ? (
                    <button
                      onClick={stopGeneration}
                      className="p-3 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-red-400 transition-all flex items-center gap-2"
                    >
                      <FiStopCircle size={18} />
                      <span className="text-sm font-medium">{t('recruiter.stop')}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={toggleRecording}
                        className={`p-3 rounded-xl transition-all ${
                          isRecording
                            ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                            : 'bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white'
                        }`}
                        title={isRecording ? t('recruiter.stopRecording') : t('recruiter.startRecording')}
                      >
                        {isRecording ? (
                          <FiX size={18} className="animate-pulse" />
                        ) : (
                          <FiMic size={18} />
                        )}
                      </button>
                      <button
                        onClick={sendMessage}
                        disabled={!input.trim() || isRecording}
                        className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 rounded-xl text-white transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:shadow-none"
                      >
                        <FiSend size={18} />
                      </button>
                    </>
                  )}
                </div>
                {isRecording && (
                  <div className="absolute left-5 top-2 text-xs text-red-400 flex items-center gap-2 animate-pulse">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    {t('recruiter.listening')}
                  </div>
                )}
              </div>

              {/* Footer */}
              <p className="text-center text-xs text-gray-600 mt-3">
                {t('recruiter.usesAdvancedMatching')}
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
