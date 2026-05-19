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
  ExternalLink,
  Zap,
  ShieldCheck as ShieldIcon
} from 'lucide-react';

interface AnalysisResult {
  title: string;
  price: string;
  location: string;
  amenities: string[];
  trustScore: number;
  status: string;
  analysisReason: string;
  redFlags: string[];
  negotiationTips: string[];
  verdict: string;
  badge: 'Aman' | 'Waspada' | 'Berisiko';
}

type PageSelection = 'scanner' | 'usage' | 'about' | 'terms';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageSelection>('scanner');
  const [url, setUrl] = useState('');
  const [manualText, setManualText] = useState('');
  const [activeTab, setActiveTab] = useState<'url' | 'manual' | 'recommend'>('url');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [searchResult, setSearchResult] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          location: searchQuery,
          minPrice: minPrice ? parseInt(minPrice) : undefined,
          maxPrice: maxPrice ? parseInt(maxPrice) : undefined
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi gangguan akses ke situs properti.');
      setSearchResult(data.listings || []);
      if (data.listings?.length === 0) {
        setError("Tidak ditemukan hasil. Situs mungkin membatasi akses atau lokasi terlalu spesifik. Coba masukkan nama Kota saja (misal: 'Jakarta').");
      }
    } catch (err: any) {
      setError(err.message || "Pencarian otomatis diblokir oleh sistem keamanan situs properti. Silakan gunakan tombol 'Cari Manual' di bawah.");
      setSearchResult([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAnalyze = async (isManual = false, directUrl?: string) => {
    if (!directUrl && activeTab === 'url' && !url.trim()) {
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

    const scanUrl = directUrl || url;

    try {
      let pageText = manualText;

      // 1. Scrape if using URL
      if (!useManual) {
        setLoadingStep("Proses Baypass Proteksi Situs...");
        const scrapeResponse = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: scanUrl }),
        });

        const scrapeData = await scrapeResponse.json();
        
        if (scrapeResponse.status === 422 || scrapeData.needsManual) {
          setActiveTab('manual');
          setError("Situs ini memiliki proteksi tinggi (Cloudflare/Bot Check). Solusi: Copy-Paste teks deskripsi iklan di bawah untuk tetap bisa menganalisis.");
          setLoading(false);
          return;
        }

        if (!scrapeResponse.ok) {
          throw new Error(scrapeData.error || 'Situs memblokir robot kami. Gunakan fitur Manual Paste.');
        }

        pageText = scrapeData.text;
        setLoadingStep("Analisis AI Berjalan...");
      }

      // 2. Call Analyze (Gemini) on Server
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pageText }),
      });

      const analysisRaw = await analyzeResponse.json();
      if (!analyzeResponse.ok) {
        throw new Error(analysisRaw.error || 'AI gagal memberikan respon.');
      }

      setResult(analysisRaw);
      if (useManual) setManualText('');
      
    } catch (err: any) {
      console.error("Analysis Error:", err);
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

  const renderScanner = () => (
    <div className="max-w-7xl mx-auto px-6 pt-16">
      <section className="mb-20">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-8"
          >
            <Zap className="w-3 h-3 fill-emerald-400" />
            RentScan AI
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter leading-tight"
          >
            Rumah Idaman, <br/> <span className="text-emerald-400">Tanpa Penipuan.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-medium"
          >
            Deteksi sewa fiktif secara cerdas. Kami hitung skor validitas berdasarkan kelengkapan data, harga pasar, dan pola mencurigakan.
          </motion.p>
        </div>

        <div className="max-w-4xl mx-auto mb-6 flex flex-wrap justify-center gap-3">
          <button 
            onClick={() => setActiveTab('recommend')}
            className={`px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${activeTab === 'recommend' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}
          >
            Rekomendasi
          </button>
          <button 
            onClick={() => { setActiveTab('url'); setResult(null); }}
            className={`px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${activeTab === 'url' ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}
          >
            Scan URL
          </button>
          <button 
            onClick={() => { setActiveTab('manual'); setResult(null); }}
            className={`px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${activeTab === 'manual' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}
          >
            Manual Paste
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'recommend' ? (
            <motion.div 
              key="recommend-tab"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-slate-900 p-2 rounded-3xl border border-indigo-500/30 shadow-2xl shadow-indigo-500/5 mb-8">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-grow">
                     <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                     <input 
                       type="text" 
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                       placeholder="Lokasi (contoh: Jakarta Selatan)..."
                       className="w-full pl-14 pr-6 py-5 bg-transparent outline-none text-white placeholder:text-slate-600 font-medium text-lg"
                     />
                  </div>
                  <div className="relative w-full sm:w-32 border-l border-slate-800">
                     <input 
                       type="number" 
                       value={minPrice}
                       onChange={(e) => setMinPrice(e.target.value)}
                       placeholder="Min (Rp)"
                       className="w-full pl-4 pr-2 py-5 bg-transparent outline-none text-white placeholder:text-slate-600 font-medium text-sm"
                     />
                  </div>
                  <div className="relative w-full sm:w-32 border-l border-slate-800">
                     <input 
                       type="number" 
                       value={maxPrice}
                       onChange={(e) => setMaxPrice(e.target.value)}
                       placeholder="Max (Rp)"
                       className="w-full pl-4 pr-2 py-5 bg-transparent outline-none text-white placeholder:text-slate-600 font-medium text-sm"
                     />
                  </div>
                  <button 
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-800 disabled:text-slate-600 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                    Search
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {!isSearching && searchResult.length === 0 && searchQuery && (
                  <div className="col-span-full">
                    <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] text-center max-w-2xl mx-auto shadow-2xl">
                      <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="text-amber-500 w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-4 uppercase italic">Pencarian Otomatis Gagal</h3>
                      <p className="text-slate-400 mb-8 font-medium">Situs utama (Pinhome, Rumah123, Lamudi) sedang memproteksi konten mereka dari robot kami. <br/><br/>Solusi: Klik tombol di bawah untuk cari sendiri, lalu paste hasilnya di tab <b>'Manual Paste'</b>.</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <a 
                          href={`https://www.pinhome.id/disewa/rumah/${searchQuery.toLowerCase().replace(/\s+/g, '-')}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          Cari di Pinhome <ExternalLink className="w-3 h-3" />
                        </a>
                        <a 
                          href={`https://www.rumah123.com/sewa/rumah/${searchQuery.toLowerCase().replace(/\s+/g, '-')}/`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          Cari di Rumah123 <ExternalLink className="w-3 h-3" />
                        </a>
                        <a 
                          href={`https://www.dotproperty.id/search/houses-for-rent?q=${encodeURIComponent(searchQuery)}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          Cari di DotProperty <ExternalLink className="w-3 h-3" />
                        </a>
                        <a 
                          href={`https://www.olx.co.id/items/q-${encodeURIComponent(searchQuery)}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          Cari di OLX <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {searchResult.map((listing, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity:0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden group hover:border-indigo-500/50 transition-all flex flex-col"
                  >
                    <div className="aspect-[16/10] bg-slate-950 relative overflow-hidden">
                      {listing.image ? (
                        <img src={listing.image} alt={listing.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                         <div className="w-full h-full flex items-center justify-center">
                            <Home className="w-12 h-12 text-slate-800" />
                         </div>
                      )}
                      <div className="absolute top-4 right-4 animate-pulse">
                        <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700">
                           <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">REAL TIME</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 flex-grow flex flex-col">
                      <h3 className="text-white font-bold leading-tight mb-2 line-clamp-2">{listing.title}</h3>
                      <p className="text-indigo-400 font-mono font-bold mb-4">{listing.price}</p>
                      
                      <div className="mt-auto flex items-center gap-2">
                        <button 
                          onClick={() => { setUrl(listing.url || ''); handleAnalyze(false, listing.url); }}
                          className="flex-grow py-3 bg-indigo-500 hover:bg-indigo-400 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95"
                        >
                          Scan Iklan Ini
                        </button>
                        <a 
                          href={listing.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-12 h-12 bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center rounded-xl transition-all"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : activeTab === 'url' ? (
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

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 max-w-3xl mx-auto"
          >
            <AlertTriangle className="text-rose-400 w-5 h-5" />
            <p className="text-sm text-rose-300 font-medium">{error}</p>
          </motion.div>
        )}
      </section>

      {/* Results Bento Grid */}
      <AnimatePresence>
        {result && (
          <div className="grid grid-cols-12 gap-6 auto-rows-[120px]">
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
                  <span className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Validity Score</span>
                </div>
              </div>

              <div className="bg-slate-950/50 border border-slate-800 px-6 py-3 rounded-2xl flex items-center gap-4">
                {getShieldIcon(result.trustScore, "w-6 h-6")}
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Status: {result.status}</p>
              </div>
            </motion.div>

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
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 italic">Analysis & Tips</h2>
              </div>
              
              <div className="space-y-4 flex-grow overflow-y-auto pr-2 custom-scrollbar">
                <div className="bg-slate-950 p-5 rounded-2xl border-l-[3px] border-emerald-400 shadow-inner">
                  <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Alasan Skor</h4>
                  <p className="text-slate-300 italic text-sm leading-relaxed font-medium">{result.analysisReason}</p>
                </div>
                <div className="bg-slate-950 p-5 rounded-2xl border-l-[3px] border-amber-400 shadow-inner">
                  <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Tips Negosiasi</h4>
                  <ul className="space-y-1">
                    {result.negotiationTips.map((tip, i) => (
                      <li key={i} className="text-slate-300 text-xs font-medium leading-relaxed flex gap-2">
                        <span className="text-amber-400">•</span> {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>

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
                  <span className="text-rose-500 text-[10px] font-black uppercase tracking-widest">{result.redFlags.length} FOUND</span>
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderUsage = () => (
    <div className="max-w-4xl mx-auto px-6 pt-32 pb-24">
      <motion.h2 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-5xl font-black text-white mb-12 text-center tracking-tighter uppercase italic"
      >
        Cara Kerja RentScan
      </motion.h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-12">
          <div className="flex gap-6">
            <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center font-black text-slate-950 shrink-0 shadow-xl shadow-emerald-500/20 text-2xl">1</div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2 uppercase italic tracking-tight underline decoration-emerald-500 underline-offset-4">Temukan Iklan</h3>
              <p className="text-slate-400 leading-relaxed font-medium">Gunakan fitur <b>Rekomendasi</b> kami atau cari iklan di situs favorit Anda (OLX, Pinhome, Mamikos). Pastikan Anda sudah menemukan properti yang dirasa cocok.</p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center font-black text-slate-950 shrink-0 shadow-xl shadow-emerald-500/20 text-2xl">2</div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2 uppercase italic tracking-tight underline decoration-emerald-500 underline-offset-4">Salin Link atau Teks</h3>
              <p className="text-slate-400 leading-relaxed font-medium">Ambil alamat (URL) iklan tersebut. Jika situsnya diproteksi, cukup salin (copy) semua teks deskripsi iklan dan gunakan fitur <b>Manual Paste</b>.</p>
            </div>
          </div>
        </div>
        <div className="space-y-12">
          <div className="flex gap-6">
            <div className="w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center font-black text-slate-950 shrink-0 shadow-xl shadow-amber-500/20 text-2xl">3</div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2 uppercase italic tracking-tight underline decoration-amber-500 underline-offset-4">Audit Otomatis</h3>
              <p className="text-slate-400 leading-relaxed font-medium">Tekan tombol Scan. RentScan AI akan langsung membedah harga, lokasi, dan pola bahasa iklan untuk mendeteksi tanda-tanda penipuan.</p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center font-black text-slate-950 shrink-0 shadow-xl shadow-amber-500/20 text-2xl">4</div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2 uppercase italic tracking-tight underline decoration-amber-500 underline-offset-4">Terima Vonis Keamanan</h3>
              <p className="text-slate-400 leading-relaxed font-medium">Lihat <b>Trust Score</b>. Jika muncul 'Berisiko' dengan tanda bahaya merah, sebaiknya jangan transfer uang apapun sebelum survey fisik.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAbout = () => (
    <div className="max-w-3xl mx-auto px-6 pt-32 pb-24 space-y-16">
      <div className="text-center">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-black text-white mb-6 tracking-tighter uppercase italic"
        >
          Tentang RentScan AI
        </motion.h2>
        <div className="w-24 h-1 bg-emerald-500 mx-auto rounded-full"></div>
      </div>
      
      <div className="space-y-8">
        <p className="text-xl text-slate-300 leading-relaxed font-medium text-center">
          RentScan AI adalah agen pencari dan penyelidik independen untuk pasar sewa properti di Indonesia.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center group hover:border-emerald-500/50 transition-colors">
            <DollarSign className="w-10 h-10 text-emerald-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-white font-bold mb-2">Harga Wajar</h3>
            <p className="text-slate-500 text-xs font-medium">AI mengukur apakah harga sewa masuk akal dibanding rata-rata wilayah.</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center group hover:border-emerald-500/50 transition-colors">
            <MapPin className="w-10 h-10 text-emerald-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-white font-bold mb-2">Verifikasi Lokasi</h3>
            <p className="text-slate-500 text-xs font-medium">Pengecekan konsistensi lokasi antara judul, peta, dan deskripsi.</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center group hover:border-emerald-500/50 transition-colors">
            <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-white font-bold mb-2">Pola Penipuan</h3>
            <p className="text-slate-500 text-xs font-medium">Deteksi otomatis ciri khas scammer seperti urgensi palsu dan DP awal.</p>
          </div>
        </div>

        <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 text-center">
          <p className="text-slate-400 leading-relaxed font-medium">
            RentScan AI menggabungkan teknologi ekstraksi data tingkat lanjut dan Gemini AI untuk memberikan validasi real-time. Kami tidak berafiliasi dengan marketplace manapun, laporan kami bersifat independen untuk keamanan pengguna.
          </p>
        </div>
      </div>
    </div>
  );

  const renderTerms = () => (
    <div className="max-w-3xl mx-auto px-6 pt-32 pb-24">
      <motion.h2 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-5xl font-black text-white mb-12 text-center tracking-tighter uppercase italic"
      >
        Terms & Safety
      </motion.h2>
      <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] space-y-8 text-slate-400 font-medium leading-relaxed shadow-2xl">
        <div className="flex gap-4">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 mt-1">
             <ShieldAlert className="w-4 h-4 text-emerald-400" />
          </div>
          <p>Laporan analisis RentScan AI adalah hasil prediksi AI. Kami tidak menjamin keakuratan 100% dan tetap menyarankan Anda melakukan survey fisik.</p>
        </div>
        <div className="flex gap-4">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 mt-1">
             <ShieldAlert className="w-4 h-4 text-emerald-400" />
          </div>
          <p>Kami tidak bertanggung jawab atas keputusan finansial atau kerugian yang terjadi akibat penggunaan data dari aplikasi ini.</p>
        </div>
        <div className="flex gap-4">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 mt-1">
             <ShieldAlert className="w-4 h-4 text-emerald-400" />
          </div>
          <p>Dilarang menggunakan aplikasi ini untuk spamming, scraping massal data pengguna lain, atau aktivitas ilegal lainnya.</p>
        </div>
        <div className="pt-6 border-t border-slate-800 text-center">
          <p className="text-emerald-400 font-bold italic">Safe Renting is a Human Right.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30 pb-20 overflow-x-hidden">
      
      {/* Dynamic Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 h-20">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div 
            onClick={() => setCurrentPage('scanner')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-transform group-active:scale-90">
              <ShieldIcon className="text-slate-950 w-6 h-6" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white uppercase italic group-hover:text-emerald-400 transition-colors">RentScan <span className="text-emerald-400 underline decoration-2 underline-offset-4">AI</span></h1>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            {[
              { id: 'scanner', label: 'Scanner' },
              { id: 'usage', label: 'Panduan' },
              { id: 'about', label: 'Tentang' },
              { id: 'terms', label: 'Terms' }
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => setCurrentPage(item.id as PageSelection)}
                className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${currentPage === item.id ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {item.label}
                {currentPage === item.id && (
                  <motion.div layoutId="underline" className="absolute -bottom-2 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 md:hidden">
             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 border border-slate-800 relative cursor-pointer" onClick={() => setCurrentPage(currentPage === 'scanner' ? 'usage' : 'scanner')}>
                <Info className="w-5 h-5 text-slate-400" />
             </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        <motion.main 
          key={currentPage}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          {currentPage === 'scanner' && renderScanner()}
          {currentPage === 'usage' && renderUsage()}
          {currentPage === 'about' && renderAbout()}
          {currentPage === 'terms' && renderTerms()}
        </motion.main>
      </AnimatePresence>
      
      {/* Common Footer */}
      <footer className="mt-32 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600 italic underline decoration-slate-800">RentScan AI Intelligent Ecosystem</h4>
            <p className="text-[10px] font-medium text-slate-700">Powered by Gemini optical grounding engines • 2026</p>
          </div>
          
          <div className="flex gap-12 font-black text-[10px] uppercase tracking-widest text-slate-600">
             <button onClick={() => setCurrentPage('usage')} className="hover:text-emerald-400 transition-colors">How It Works</button>
             <button onClick={() => setCurrentPage('about')} className="hover:text-emerald-400 transition-colors">Our Mission</button>
             <button onClick={() => setCurrentPage('terms')} className="hover:text-emerald-400 transition-colors">Legal Safety</button>
          </div>

          <p className="text-[10px] font-mono text-slate-800 uppercase tracking-tighter">
            PRO-MODE ENCRYPTED • INDONESIA REGION ACTIVE
          </p>
        </div>
      </footer>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  );
}
