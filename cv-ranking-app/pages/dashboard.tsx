import Head from 'next/head';
import { useState, useEffect } from 'react';
import { 
  FiBarChart2, 
  FiUsers, 
  FiAward,
  FiTarget,
  FiActivity,
  FiCpu
} from 'react-icons/fi';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCandidates: 0,
    averageScore: 0,
    topScore: 0,
    candidates: [] as any[]
  });

  useEffect(() => {
    const storedRankings = localStorage.getItem('cvRankings');
    if (storedRankings) {
      try {
        const rankings = JSON.parse(storedRankings);
        const scores = rankings.map((r: any) => r.total_score);
        setStats({
          totalCandidates: rankings.length,
          averageScore: scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0,
          topScore: scores.length > 0 ? Math.max(...scores) : 0,
          candidates: rankings
        });
      } catch (e) {
        console.error('Error parsing stored rankings:', e);
      }
    }
  }, []);

  return (
    <>
      <Head>
        <title>Analytics - Smart Hire</title>
      </Head>

      <div className="min-h-screen pt-24 px-6 pb-12">
        <div className="aurora-bg"></div>
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="flex items-center gap-4 animate-fade-in-up">
            <div className="p-3 bg-blue-600/20 rounded-xl border border-blue-500/30">
              <FiActivity className="w-8 h-8 text-blue-400" />
            </div>
            <div>
               <h1 className="text-4xl font-bold text-white">Analytics Dashboard</h1>
               <p className="text-gray-400">Live recruitment metrics and candidate insights</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
             <StatCard 
               label="Candidates Processed" 
               value={stats.totalCandidates} 
               icon={FiUsers} 
               color="blue" 
             />
             <StatCard 
               label="Average Score" 
               value={stats.averageScore.toFixed(1)} 
               icon={FiBarChart2} 
               color="purple" 
             />
             <StatCard 
               label="Highest Score" 
               value={stats.topScore.toFixed(1)} 
               icon={FiAward} 
               color="pink" 
             />
             <StatCard 
               label="System Status" 
               value="Active" 
               icon={FiCpu} 
               color="emerald" 
             />
          </div>

          {/* Charts/Vis Section - Simplified as Bar Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
             
             {/* Top Candidates */}
             <div className="glass-panel p-6 rounded-2xl">
               <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                 <FiTarget className="text-blue-400" /> Top Performers
               </h3>
               <div className="space-y-4">
                 {stats.candidates.slice(0, 5).map((c: any, i) => (
                   <div key={i} className="flex items-center gap-4">
                      <div className="text-lg font-bold text-gray-500 w-6">#{i+1}</div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-white font-medium">{c.candidate_name}</span>
                          <span className="text-blue-400 font-mono">{c.total_score.toFixed(1)}</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                             className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"
                             style={{ width: `${c.total_score}%` }}
                          ></div>
                        </div>
                      </div>
                   </div>
                 ))}
                 {stats.candidates.length === 0 && (
                   <div className="text-gray-500 text-center py-8">No data available</div>
                 )}
               </div>
             </div>

             {/* Distribution Placeholder */}
             <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                 <FiActivity className="text-purple-400" /> Score Distribution
               </h3>
               <div className="flex items-end justify-between h-[200px] gap-2 px-4">
                  {[40, 65, 30, 80, 55, 90, 45, 70].map((h, i) => (
                    <div key={i} className="w-full bg-white/5 rounded-t-lg hover:bg-purple-500/20 transition-all relative group h-full">
                       <div 
                         className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-purple-600/50 to-blue-600/50 rounded-t-lg transition-all duration-1000"
                         style={{ height: `${h}%` }}
                       ></div>
                    </div>
                  ))}
               </div>
               <div className="flex justify-between text-xs text-gray-500 mt-4 px-2">
                 <span>0-20</span>
                 <span>20-40</span>
                 <span>40-60</span>
                 <span>60-80</span>
                 <span>80-100</span>
               </div>
             </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    pink: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  };

  return (
    <div className={`glass-panel p-6 rounded-2xl border ${colors[color].split(' ')[2]} relative overflow-hidden group`}>
       <div className={`absolute top-0 right-0 p-3 opacity-20 transform translate-x-1/2 -translate-y-1/2 scale-150 rounded-full ${colors[color].split(' ')[1]}`}>
         <Icon className="w-16 h-16" />
       </div>
       
       <div className="relative z-10">
         <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${colors[color]}`}>
           <Icon className="w-5 h-5" />
         </div>
         <div className="text-3xl font-bold text-white mb-1 group-hover:scale-105 transition-transform origin-left">
           {value}
         </div>
         <div className="text-sm text-gray-400 font-medium">{label}</div>
       </div>
    </div>
  );
}
