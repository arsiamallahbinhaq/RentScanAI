import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import "dotenv/config";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper to use Firecrawl
  async function firecrawlScrape(url: string) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      console.warn("FIRECRAWL_API_KEY not set. Falling back to simple fetch.");
      return null;
    }

    try {
      console.log(`Attempting Firecrawl scrape for:`, url);
      const res = await axios.post(
        "https://api.firecrawl.dev/v1/scrape",
        {
          url,
          formats: ["markdown"],
          onlyMainContent: true
        },
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          timeout: 45000
        }
      );

      return res.data?.data?.markdown || res.data?.markdown || null;
    } catch (err: any) {
      console.warn(`Firecrawl scrape failed: ${err.response?.status || err.message}`);
      return null;
    }
  }

  // Helper to use Firecrawl Search
  async function firecrawlSearch(query: string) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) return null;

    try {
      console.log(`Attempting Firecrawl search for:`, query);
      const res = await axios.post(
        "https://api.firecrawl.dev/v1/search",
        {
          query,
          limit: 10,
          lang: "id"
        },
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          timeout: 45000
        }
      );

      return res.data?.data || null;
    } catch (err: any) {
      console.warn(`Firecrawl search failed: ${err.response?.status || err.message}`);
      return null;
    }
  }

  // Helper to use MR Scraper AI (CARA A)
  async function mrScraperAISearch(url: string) {
    const token = process.env.MR_SCRAPER_API_TOKEN;
    if (!token) return null;

    try {
      console.log(`Attempting MR Scraper AI Search for:`, url);
      const schema = {
        type: "array",
        description: "Daftar listing sewa rumah",
        items: {
          type: "object",
          properties: {
            judul: { type: "string" },
            harga: { type: "number" },
            lokasi: { type: "string" },
            url_listing: { type: "string" },
            image_url: { type: "string" }
          },
          required: ["judul", "harga", "lokasi", "url_listing"]
        }
      };

      const res = await axios.post(
        "https://app.mrscraper.com/api/ai",
        {
          urls: [url],
          min: 5,
          max: 15,
          timeout: 180,
          schema: schema
        },
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          timeout: 190000 
        }
      );

      return res.data?.result || null;
    } catch (err: any) {
      console.warn(`MR Scraper AI search failed: ${err.response?.status || err.message}`);
      return null;
    }
  }

  // Helper to use MR Scraper AI (CARA A)
  async function mrScraperAIScrape(url: string) {
    const token = process.env.MR_SCRAPER_API_TOKEN;
    if (!token) return null;

    try {
      console.log(`Attempting MR Scraper AI Scrape for:`, url);
      const schema = {
        type: "object",
        description: "Detail properti sewa",
        properties: {
          judul: { type: "string" },
          harga: { type: "number" },
          lokasi: { type: "string" },
          deskripsi: { type: "string" },
          fasilitas: { type: "array", items: { type: "string" } }
        },
        required: ["judul", "harga", "lokasi", "deskripsi"]
      };

      const res = await axios.post(
        "https://app.mrscraper.com/api/ai",
        {
          urls: [url],
          timeout: 180,
          schema: schema
        },
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          timeout: 190000 
        }
      );

      const result = res.data?.result?.[0] || res.data?.result || null;
      if (result) {
        return `JUDUL: ${result.judul}\nHARGA: ${result.harga}\nLOKASI: ${result.lokasi}\nDESKRIPSI: ${result.deskripsi}\nFASILITAS: ${result.fasilitas?.join(', ')}`;
      }
      return null;
    } catch (err: any) {
      console.warn(`MR Scraper AI scrape failed: ${err.response?.status || err.message}`);
      return null;
    }
  }

  // Helper to use ScrapingAnt
  async function scrapingAntScrape(url: string) {
    const apiKey = process.env.SCRAPINGANT_API_KEY;
    if (!apiKey) return null;

    try {
      console.log(`Attempting ScrapingAnt scrape for:`, url);
      const res = await axios.get(`https://api.scrapingant.com/v2/general`, {
        params: {
          url: url,
          "x-api-key": apiKey,
          browser: false // false for speed, true if needed
        },
        timeout: 30000
      });

      if (res.data) {
        const $ = cheerio.load(res.data);
        $('script, style, nav, footer, iframe, noscript, header, aside').remove();
        return $('body').text().replace(/\s+/g, ' ').trim().substring(0, 10000);
      }
      return null;
    } catch (err: any) {
      console.warn(`ScrapingAnt scrape failed: ${err.response?.status || err.message}`);
      return null;
    }
  }

  // API Routes
  app.post("/api/scrape", async (req, res) => {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL iklan diperlukan" });
    }

    try {
      let pageText = "";
      
      try {
        // Standard Scrape first (quick check)
        const scrapeRes = await axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          },
          timeout: 8000,
        });

        const $ = cheerio.load(scrapeRes.data);
        $('script, style, nav, footer, iframe, noscript, header, aside').remove();
        pageText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 8000);
        
        if (pageText.length < 50) throw new Error("Content too short");
      } catch (scrapeErr: any) {
        console.warn("Standard Scrape failed, trying Firecrawl...", scrapeErr.message);
        const markdown = await firecrawlScrape(url);
        if (markdown) {
          pageText = markdown.substring(0, 15000);
          console.log("Firecrawl success, markdown length:", pageText.length);
        } else {
          console.warn("Firecrawl failed, trying MR Scraper fallback...");
          const mrText = await mrScraperAIScrape(url);
          if (mrText) {
            pageText = mrText;
            console.log("MR Scraper success");
          } else {
            console.warn("MR Scraper failed, trying ScrapingAnt fallback...");
            const antText = await scrapingAntScrape(url);
            if (antText) {
              pageText = antText;
              console.log("ScrapingAnt success");
            }
          }
        }
      }

      if (!pageText || pageText.length < 50) {
        return res.status(422).json({ 
          error: "Situs properti memproteksi konten atau token robot (Firecrawl/MrScraper/ScrapingAnt) habis. Gunakan tombol 'Manual Paste' di bawah untuk menganalisis teks iklan secara instan.", 
          needsManual: true 
        });
      }

      res.json({ text: pageText });

    } catch (error: any) {
      console.error("Scrape Error:", error);
      res.status(500).json({ error: "Gagal membaca situs secara otomatis." });
    }
  });

  app.post("/api/analyze", async (req, res) => {
    const { text } = req.body;
    if (!text || text.length < 50) {
      return res.status(400).json({ error: "Konten iklan terlalu pendek atau tidak valid." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "API Key Gemini belum dikonfigurasi di server." });
    }

    try {
      const { GoogleGenAI, Type } = await import("@google/genai");
      const client = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const prompt = `
        Kamu adalah "RentScan AI", agen pencari sewa rumah cerdas.
        Analisis iklan sewa properti berikut dalam Bahasa Indonesia:
        "${text}"
        
        SISTEM PENILAIAN (Skor 0-100):
        - Kelengkapan info: judul jelas, harga tertera, alamat lengkap (+30 poin)
        - Foto tersedia dan banyak (+20 poin) - asumsikan dari teks jika disebutkan
        - Deskripsi detail >100 kata (+20 poin)
        - Kontak valid format Indonesia (+15 poin)
        - Posting baru (+15 poin)

        RED FLAGS (Kurangi 30 poin per item jika ditemukan):
        - Harga <50% rata-rata area (Sangat mencurigakan)
        - Deskripsi sangat singkat <30 kata
        - Tidak ada foto (jika disebutkan tidak ada)
        - Ada kata: "transfer dulu", "DP tanpa survei", "hubungi cepat sebelum diambil orang"
        - Nomor telepon tidak valid

        TUGAS:
        1. Ekstrak Detail: Judul, Harga, Lokasi, Fasilitas.
        2. Hitung SKOR VALIDITAS (0-100) berdasarkan kriteria di atas.
        3. Tentukan STATUS: [VALID / PERLU VERIFIKASI / MENCURIGAKAN].
        4. Berikan Alasan: 2-3 kalimat tajam mengapa skor tersebut diberikan.
        5. Berikan Tips Negosiasi spesifik untuk iklan ini.
      `;

      const result = await client.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              price: { type: Type.STRING },
              location: { type: Type.STRING },
              amenities: { type: Type.ARRAY, items: { type: Type.STRING } },
              trustScore: { type: Type.NUMBER },
              status: { type: Type.STRING }, // VALID / PERLU VERIFIKASI / MENCURIGAKAN
              analysisReason: { type: Type.STRING },
              redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
              negotiationTips: { type: Type.ARRAY, items: { type: Type.STRING } },
              verdict: { type: Type.STRING },
              badge: { type: Type.STRING, enum: ["Aman", "Waspada", "Berisiko"] }
            },
            required: ["title", "price", "location", "amenities", "trustScore", "status", "analysisReason", "redFlags", "negotiationTips", "verdict", "badge"]
          }
        }
      });

      const responseText = result.text;
      if (!responseText) throw new Error("Kosongnya respon AI.");
      const analysis = JSON.parse(responseText);
      res.json(analysis);
    } catch (err: any) {
      console.error("Gemini Analysis Error:", err.message);
      res.status(500).json({ error: "Gagal menganalisis dengan AI: " + err.message });
    }
  });

  app.post("/api/search", async (req, res) => {
    const { location, minPrice, maxPrice } = req.body;
    if (!location) return res.status(400).json({ error: "Lokasi diperlukan" });

    try {
      let finalResults: any[] = [];
      let source = "Firecrawl";

      // 1. Coba Firecrawl Search (General Search)
      let query = `sewa rumah apartemen terbaru di ${location}`;
      if (minPrice) query += ` harga mulai ${minPrice}`;
      if (maxPrice) query += ` sampai ${maxPrice}`;
      query += ` olx rumah123 lamudi 99.co`;

      try {
        const searchResults = await firecrawlSearch(query);
        if (searchResults && searchResults.length > 0) {
          finalResults = searchResults.map((item: any) => ({
            title: item.title || "Properti Sewa",
            price: "Cek di situs",
            location: location,
            url: item.url || item.link,
            image: item.image || item.thumbnail || null,
            content: item.description || item.snippet || ""
          }));
        }
      } catch (e) {
        console.warn("Firecrawl search error, falling back...");
      }

      // 2. Fallback ke MR Scraper AI on OLX jika Firecrawl kosong
      if (finalResults.length === 0) {
        console.log("Firecrawl search returned no results, trying MR Scraper fallback...");
        source = "MR Scraper";
        let olxUrl = `https://www.olx.co.id/properti/rumah-disewa_c5080?search[description]=${encodeURIComponent(location)}`;
        if (minPrice) olxUrl += `&search[filter_float_price:from]=${minPrice}`;
        if (maxPrice) olxUrl += `&search[filter_float_price:to]=${maxPrice}`;
        
        const mrResults = await mrScraperAISearch(olxUrl);
        
        if (mrResults && mrResults.length > 0) {
          finalResults = mrResults.map((item: any) => ({
            title: item.judul,
            price: item.harga ? `Rp ${item.harga.toLocaleString('id-ID')}` : "Cek di situs",
            location: item.lokasi,
            url: item.url_listing,
            image: item.image_url || null,
            content: `Listing dari ${source}.`
          }));
        }
      }

      if (finalResults.length === 0) {
        throw new Error("Pencarian robot gagal atau tidak menemukan data di semua provider.");
      }

      res.json({ listings: finalResults.slice(0, 8) });
    } catch (error: any) {
      console.error("Search Error:", error.message);
      res.status(500).json({ error: "Gagal mencari listing. Coba masukkan lokasi yang lebih spesifik." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
