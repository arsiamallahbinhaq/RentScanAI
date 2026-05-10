import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  DollarSign, 
  Info,
  Loader2,
  ArrowRight,
  Home,
  MessageSquareWarning,
  ExternalLink
} from 'lucide-react';

interface AnalysisResult {
  title: string;
  price: string;
  location: string;
  amenities: string[];
  trustScore: number;
  priceAnalysis: string;
  consistencyCheck: string;
  redFlags: string[];
  verdict: string;
  badge: 'Aman' | 'Waspada' | 'Berisiko';
}

export default function App() {
  const [url, setUrl] = useState('');
  const [manualText, setManualText] = useState('');
  const [activeTab, setActiveTab] = useState<'url' | 'manual'>('url');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (isManual = false) => {
    if (activeTab === 'url' && !url.trim()) {
      setError("Silakan masukkan URL iklan terlebih dahulu.");
      return;
    }
    if (activeTab === 'manual' && !manualText.trim()) {
      setError("Silakan masukkan teks iklan terlebih dahulu.");
      return;
    }
    
    setLoading(true);
    const useManual = activeTab === 'manual' || isManual;
    setLoadingStep(useManual ? "Menganalisis Teks..." : "Membaca Situs...");
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: useManual ? null : url,
          rawText: useManual ? manualText : null 
        }),
      });

      if (!useManual && response.ok) {
        setLoadingStep("Situs Berhasil Dibaca. Menganalisis dengan AI...");
      }

      const data = await response.json();

      if (response.status === 422 || data.needsManual) {
        setActiveTab('manual');
        setError("Situs ini memblokir pembacaan otomatis. Silakan Copy-Paste teks deskripsi iklan di bawah.");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menganalisis');
      }

      setResult(data);
      setManualText('');
    } catch (err: any) {
      console.error("Frontend Error:", err);
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (score >= 50) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  };

  const getBadgeStyles = (badge: string) => {
    switch (badge) {
      case 'Aman': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Waspada': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Berisiko': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getShieldIcon = (score: number, size = "w-8 h-8") => {
    if (score >= 80) return <ShieldCheck className={`${size} text-emerald-400`} />;
    if (score >= 50) return <ShieldAlert className={`${size} text-amber-400`} />;
    return <ShieldX className={`${size} text-rose-400`} />;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30 pb-20 overflow-x-hidden">
      {/* Header Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Search className="text-slate-950 w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">RentScan <span className="text-emerald-400 italic">AI</span></h1>
          </div>
          
          <div className="hidden md:flex items-center gap-2 bg-slate-950/50 border border-slate-800 rounded-full px-4 py-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gemini Engine Active</span>
          </div>

          <div className="flex items-center gap-4">
            <button className="hidden sm:block text-sm font-bold text-slate-400 uppercase tracking-widest hover:text-white transition-colors">Doc</button>
            <button className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20">
              Upgrade
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-16">
        {/* Search Layout */}
        <section className="mb-20">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-black text-white mb-6 tracking-tighter leading-tight"
            >
              DETECT RENTAL <br/> <span className="text-emerald-400">SCAMS INSTANTLY.</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-slate-400 font-medium"
            >
              Analyze listings from any Indonesian marketplace with real-time AI validation.
            </motion.p>
          </div>

          <div className="max-w-3xl mx-auto mb-6 flex justify-center gap-4">
            <button 
              onClick={() => setActiveTab('url')}
              className={`px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${activeTab === 'url' ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}
            >
              Scan URL
            </button>
            <button 
              onClick={() => setActiveTab('manual')}
              className={`px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${activeTab === 'manual' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}
            >
              Manual Paste
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'url' ? (
              <motion.div 
                key="url-tab"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-slate-900 p-2 rounded-3xl border border-slate-800 shadow-2xl shadow-emerald-500/5 max-w-3xl mx-auto"
              >
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-grow">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input 
                      type="text" 
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Paste rental URL here (OLX, Pinhome, etc)..."
                      className="w-full pl-14 pr-6 py-5 bg-transparent outline-none text-white placeholder:text-slate-600 font-medium text-lg"
                    />
                  </div>
                  <button 
                    onClick={() => handleAnalyze()}
                    disabled={loading}
                    className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 px-10 py-5 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-[10px] font-bold">{loadingStep}</span>
                      </div>
                    ) : (
                      <>
                        Scan URL
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="manual-tab"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-slate-900 p-6 rounded-3xl border border-amber-500/30 max-w-3xl mx-auto shadow-2xl shadow-amber-500/10"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Info className="text-amber-400 w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest italic">Manual Listing Analysis</h3>
                    <p className="text-xs text-slate-400">Tempel teks deskripsi iklan yang ingin divalidasi AI di bawah ini.</p>
                  </div>
                </div>
                <textarea 
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Contoh: Disewakan kontrakan 2 kamar di Depok, harga 1.5jt per bulan..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-slate-300 min-h-[200px] outline-none focus:border-amber-500 transition-all font-sans text-sm leading-relaxed"
                />
                <button 
                  onClick={() => handleAnalyze(true)}
                  disabled={loading || !manualText.trim()}
                  className="mt-4 w-full py-5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>{loadingStep}</span>
                    </div>
                  ) : "Analisis Sekarang"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>


        {/* Results Bento Grid */}
        <AnimatePresence>
          {result && (
            <div className="grid grid-cols-12 gap-6 auto-rows-[120px]">
              {/* 1. Trust Score Card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="col-span-12 lg:col-span-4 row-span-4 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 flex flex-col items-center justify-center relative overflow-hidden group shadow-xl"
              >
                <div className="absolute top-0 right-0 p-6">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getBadgeStyles(result.badge)}`}>
                    {result.badge} LEVEL
                  </span>
                </div>
                
                <div className="relative mb-8 pt-4">
                  <svg className="w-56 h-56 transform -rotate-90">
                    <circle cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-slate-950" />
                    <motion.circle 
                      initial={{ strokeDashoffset: 628 }}
                      animate={{ strokeDashoffset: 628 - (628 * result.trustScore) / 100 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      cx="112" cy="112" r="100" 
                      stroke="currentColor" strokeWidth="16" fill="transparent" 
                      strokeDasharray="628"
                      className={`${getScoreColor(result.trustScore)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-7xl font-black text-white italic tracking-tighter">{result.trustScore}%</span>
                    <span className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Trust Index</span>
                  </div>
                </div>

                <div className="bg-slate-950/50 border border-slate-800 px-6 py-3 rounded-2xl flex items-center gap-4">
                  {getShieldIcon(result.trustScore, "w-6 h-6")}
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Listing Verification Status</p>
                </div>
              </motion.div>

              {/* 2. Skeptic AI Advisor */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="col-span-12 lg:col-span-5 row-span-3 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 flex flex-col"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30">
                    <Info className="text-indigo-400 w-5 h-5" />
                  </div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 italic">The Skeptic Advisor</h2>
                </div>
                
                <div className="space-y-4 flex-grow overflow-y-auto pr-2 custom-scrollbar">
                  <div className="bg-slate-950 p-5 rounded-2xl border-l-[3px] border-emerald-400 shadow-inner">
                    <p className="text-slate-300 italic text-sm leading-relaxed font-medium">"{result.priceAnalysis}"</p>
                  </div>
                  <div className="bg-slate-950 p-5 rounded-2xl border-l-[3px] border-amber-400 shadow-inner">
                    <p className="text-slate-300 italic text-sm leading-relaxed font-medium">"{result.consistencyCheck}"</p>
                  </div>
                </div>
              </motion.div>

              {/* 3. Basic Details Card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="col-span-12 lg:col-span-3 row-span-3 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 flex flex-col justify-between"
              >
                <div>
                  <Home className="text-emerald-400 w-8 h-8 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2 leading-tight">{result.title}</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span className="text-lg font-mono text-emerald-400">{result.price}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-400 truncate uppercase tracking-tight">{result.location}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 mt-4">
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-500 hover:text-emerald-400 transition-colors"
                  >
                    View Original <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </motion.div>

              {/* 4. Price Logic Status */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="col-span-6 lg:col-span-2 row-span-2 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 flex flex-col justify-between text-center"
              >
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Price Logic</p>
                <div className={`text-xl font-mono uppercase tracking-tighter italic ${result.trustScore < 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {result.trustScore < 50 ? 'Suspicious' : 'Realistic'}
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${result.trustScore}%` }}
                    className={`h-full ${result.trustScore < 50 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  />
                </div>
              </motion.div>

              {/* 5. Health Status */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="col-span-6 lg:col-span-2 row-span-2 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 flex flex-col justify-between text-center"
              >
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Integrity</p>
                <div className={`text-xl font-mono uppercase tracking-tighter italic ${getScoreColor(result.trustScore)}`}>
                  {result.badge}
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${result.trustScore}%` }}
                    className={`h-full ${getScoreBg(result.trustScore).split(' ')[0]}`}
                  />
                </div>
              </motion.div>

              {/* 6. Red Flags Detailed */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="col-span-12 lg:col-span-5 row-span-3 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Anomaly Detection
                  </h3>
                  {result.redFlags.length > 0 && (
                    <span className="text-rose-500 text-[10px] font-black uppercase tracking-widest">{result.redFlags.length} CRITICAL FOUND</span>
                  )}
                </div>
                
                <ul className="space-y-3">
                  {result.redFlags.length > 0 ? (
                    result.redFlags.map((flag, i) => (
                      <li key={i} className="flex items-start gap-4 p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10">
                        <div className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-1.5 flex-shrink-0 animate-pulse" />
                        <span className="text-xs font-medium text-slate-300 leading-relaxed">{flag}</span>
                      </li>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 opacity-40">
                      <ShieldCheck className="w-12 h-12 text-emerald-500 mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No Patterns Found</p>
                    </div>
                  )}
                </ul>
              </motion.div>

              {/* 7. Final Verdict Box */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="col-span-12 lg:col-span-3 row-span-3 bg-emerald-500 border border-emerald-400 rounded-[2.5rem] p-8 flex flex-col justify-between relative overflow-hidden group shadow-2xl shadow-emerald-500/20"
              >
                <div className="absolute -right-4 -top-4 p-8 opacity-20 pointer-events-none group-hover:rotate-12 transition-transform duration-500">
                  <ShieldCheck className="w-32 h-32 text-slate-950" />
                </div>
                <h4 className="text-xs font-black text-slate-950 uppercase tracking-widest mb-4 italic">The Final Verdict</h4>
                <p className="text-slate-950 font-black text-xl leading-snug italic font-serif relative z-10 text-pretty">
                  "{result.verdict}"
                </p>
                <div className="mt-6 flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-950/60 leading-none">Security Guaranteed</span>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!result && !loading && !error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 opacity-20"
          >
            <div className="w-24 h-24 bg-slate-900 border-2 border-slate-800 rounded-full flex items-center justify-center mb-8">
              <ShieldCheck className="w-10 h-10 text-emerald-400" />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Awaiting Search Query</p>
          </motion.div>
        )}
      </main>

      <footer className="mt-32 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600">RentScan AI Systems</h4>
            <p className="text-[10px] font-medium text-slate-700">Protected by Neural Analysis Protocol RS-2024</p>
          </div>
          
          <div className="flex gap-12 font-black text-[10px] uppercase tracking-widest text-slate-600">
             <a href="#" className="hover:text-emerald-400 transition-colors">Safety Index</a>
             <a href="#" className="hover:text-emerald-400 transition-colors">API Endpoint</a>
             <a href="#" className="hover:text-emerald-400 transition-colors">Terms of Use</a>
          </div>

          <p className="text-[10px] font-mono text-slate-800 uppercase tracking-tighter">
            PRO-MODE ENCRYPTED • SCANNING LATENCY 1.2S
          </p>
        </div>
      </footer>
      
      {/* Scrollbar CSS */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  );
}
