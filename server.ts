import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import { GoogleGenAI, Type } from "@google/genai";
import "dotenv/config";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/analyze", async (req, res) => {
    const { url, rawText } = req.body;

    if (!url && !rawText) {
      return res.status(400).json({ error: "URL atau teks iklan diperlukan" });
    }

    try {
      let pageText = rawText || "";
      
      // 1. Scrape if URL is provided and text is not
      if (url && !pageText) {
        try {
          // Standard Scrape
          const scrapeRes = await axios.get(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            },
            timeout: 15000,
          });

          const $ = cheerio.load(scrapeRes.data);
          $('script, style, nav, footer, iframe, noscript, header, aside').remove();
          pageText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 8000);
          
          if (pageText.length < 50) throw new Error("Content too short");
        } catch (scrapeErr: any) {
          console.warn("Standard Scrape failed, trying MR Scraper...", scrapeErr.message);
          
          // Try fallback to MR Scraper if API Key exists
          const mrScraperKey = process.env.MR_SCRAPER_API_KEY;
          if (mrScraperKey && url) {
            try {
              console.log("Attempting MR Scraper for:", url);
              const mrRes = await axios.get(`https://api.mrscraper.com/v1/scrape`, {
                params: {
                  api_key: mrScraperKey,
                  url: url,
                  wait: 3000, // Give more time for heavy sites like OLX
                  proxy_type: 'residential' // Better for anti-bot
                },
                timeout: 45000
              });
              
              // Handle different possible response structures
              const htmlContent = mrRes.data?.content || mrRes.data?.html || mrRes.data?.data || mrRes.data?.body;
              
              if (htmlContent && typeof htmlContent === 'string') {
                const $ = cheerio.load(htmlContent);
                $('script, style, nav, footer, iframe, noscript, header, aside, .footer, .header, #footer, #header').remove();
                pageText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 15000);
                console.log("MR Scraper success, text length:", pageText.length);
              } else if (htmlContent && typeof htmlContent === 'object') {
                // If it's already extracted JSON
                pageText = JSON.stringify(htmlContent);
              } else {
                console.warn("MR Scraper returned unknown content structure:", typeof htmlContent);
              }
            } catch (mrErr: any) {
              const status = mrErr.response?.status;
              if (status === 401 || status === 403) {
                console.error("MR Scraper API Key invalid or limit reached.");
              } else {
                console.error("MR Scraper error:", mrErr.message);
              }
            }
          }
        }

        if (!pageText || pageText.length < 50) {
          return res.status(422).json({ 
            error: "Situs memblokir pembacaan otomatis atau token robot habis. Gunakan tab 'Manual Paste' untuk hasil instan.", 
            needsManual: true 
          });
        }
      }

      if (!pageText || pageText.length < 15) {
        return res.status(400).json({ error: "Teks terlalu pendek untuk dianalisis." });
      }

      // 2. Call Gemini
      const apiKey = process.env.USER_GEMINI_KEY || process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey.includes("MY_GEMINI_API_KEY") || apiKey.length < 10) {
        return res.status(500).json({ 
          error: "API Key belum terdeteksi.", 
          details: "Silakan tambah Secret baru dengan nama USER_GEMINI_KEY dan masukkan Key Anda di sana." 
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        Analisis iklan sewa properti berikut:
        "${pageText}"
        
        TUGAS:
        1. Ekstrak Detail: Judul, Harga, Lokasi, Fasilitas Utama.
        2. Analisis Harga: Apakah wajar/murah/mahal untuk wilayah tersebut? (Konteks Indonesia).
        3. Deteksi Penipuan: Cari pola mencurigakan (DP di awal, harga mencurigakan rendah, urgensi palsu).
        4. Berikan Trust Score (0-100%).
        5. Vonis Akhir: Berikan kesimpulan singkat dalam Bahasa Indonesia yang skeptis namun membantu.

        PENTING: Berikan data dalam format JSON murni.
      `;

      const aiResponse = await ai.models.generateContent({
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
              priceAnalysis: { type: Type.STRING },
              consistencyCheck: { type: Type.STRING },
              redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
              verdict: { type: Type.STRING },
              badge: { type: Type.STRING, enum: ["Aman", "Waspada", "Berisiko"] }
            },
            required: ["title", "price", "location", "amenities", "trustScore", "priceAnalysis", "consistencyCheck", "redFlags", "verdict", "badge"]
          }
        }
      });

      const analysisRaw = aiResponse.text;
      if (!analysisRaw) throw new Error("AI gagal memberikan respon.");

      const analysis = JSON.parse(analysisRaw);
      res.json(analysis);

    } catch (error: any) {
      console.error("Analysis Error:", error);
      let errorMsg = "Gagal menganalisis properti. Silakan coba lagi.";
      if (error.message?.includes("API key not valid")) {
        errorMsg = "API Key tidak valid. Pastikan (AIzaSy...) sudah benar di menu Secrets.";
      }
      res.status(500).json({ error: errorMsg, details: error.message });
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
