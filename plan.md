# 🏠 RumahFinder AI — Plan Komprehensif
> Sistem pencarian sewa rumah menggunakan Google AI Studio (Gemini) + Multi Scraper API  
> Dibuat: Mei 2026 | Versi: 1.0  
> Tujuan dokumen: Panduan rebuild, bug fixing, dan pengembangan lanjutan oleh Gemini AI

---

## 📋 Daftar Isi
1. [Gambaran Sistem](#1-gambaran-sistem)
2. [Arsitektur & Alur Data](#2-arsitektur--alur-data)
3. [Komponen Utama](#3-komponen-utama)
4. [Konfigurasi API Keys](#4-konfigurasi-api-keys)
5. [System Prompt Gemini](#5-system-prompt-gemini)
6. [Scraper API — Detail & Code](#6-scraper-api--detail--code)
7. [Script Utama End-to-End](#7-script-utama-end-to-end)
8. [Format Data & Schema](#8-format-data--schema)
9. [Logika Validasi Iklan](#9-logika-validasi-iklan)
10. [URL Target Scraping](#10-url-target-scraping)
11. [Troubleshooting & Bug Fixing](#11-troubleshooting--bug-fixing)
12. [Batasan & Kuota Gratis](#12-batasan--kuota-gratis)
13. [Roadmap Pengembangan](#13-roadmap-pengembangan)

---

## 1. Gambaran Sistem

### Tujuan
Sistem ini membantu pengguna menemukan iklan sewa rumah yang **valid dan sesuai kriteria** dari berbagai platform properti Indonesia, lalu menganalisisnya menggunakan Gemini AI untuk memberikan rekomendasi terranking.

### Stack Teknologi
| Komponen | Tool | Keterangan |
|---|---|---|
| AI Analyzer | Google Gemini (via AI Studio) | Model: `gemini-1.5-pro` |
| Scraper Utama | ScrapingAnt | 10.000 kredit/bulan gratis |
| Scraper Output LLM | Firecrawl | 1.000 kredit/bulan, output Markdown |
| Scraper Cadangan 1 | Scrape.do | 1.000 kredit/bulan, success rate 98% |
| Scraper Cadangan 2 | ScraperAPI | 5.000 trial + 1.000/bulan |
| Scraper AI Schema | Mr. Scraper | Kredit terbatas, untuk AI extraction |
| Bahasa | Python 3.10+ | |
| Format Output | JSON + Markdown | |

### Prinsip Desain
- **Multi-scraper rotation**: Tidak bergantung pada satu provider, otomatis failover
- **Validasi AI**: Gemini mendeteksi iklan palsu/mencurigakan secara otomatis
- **Zero cost**: Seluruh pipeline bisa berjalan dengan free tier semua tool
- **Modular**: Setiap komponen bisa diganti independen

---

## 2. Arsitektur & Alur Data

```
User Input (lokasi, budget, kriteria)
        ↓
Gemini: Parse Intent → Generate Query URL
        ↓
Scraper Router (coba urutan: ScrapingAnt → Firecrawl → Scrape.do → ScraperAPI → MrScraper)
        ↓
Raw HTML / Markdown dari platform properti
        ↓
Gemini: Analisis + Validasi + Scoring
        ↓
Ranked Results (JSON terstruktur)
        ↓
Output ke User (Top 5 listing + alasan + skor)
```

### Flow Detail
```
Step 1: User ketik permintaan natural language
        "Cari rumah sewa di Kemang, max 7 juta, 2 KT, ada garasi"

Step 2: Gemini ekstrak parameter:
        - lokasi: "Kemang, Jakarta Selatan"
        - budget_max: 7000000
        - kamar_tidur_min: 2
        - fasilitas: ["garasi"]
        - tipe_penghuni: "keluarga"

Step 3: Build URL scraping per platform

Step 4: Scraper Router → ambil HTML/Markdown

Step 5: Gemini analisis setiap listing:
        - Skor validitas 0-100
        - Deteksi red flags
        - Bandingkan harga dengan pasar area

Step 6: Return JSON ranked results + tips negosiasi
```

---

## 3. Komponen Utama

### 3.1 Scraper Router
File: `scraper_router.py`  
Fungsi: Mencoba setiap scraper secara berurutan. Jika satu gagal (error/kuota habis), otomatis pindah ke berikutnya.

**Urutan prioritas:**
1. ScrapingAnt (10.000 kredit/bulan — paling banyak)
2. Firecrawl (1.000 kredit/bulan — output Markdown terbaik untuk LLM)
3. Scrape.do (1.000 kredit/bulan — success rate tertinggi 98%)
4. ScraperAPI (5.000 trial + 1.000/bulan)
5. Mr. Scraper (kredit terbatas — simpan untuk site susah)

### 3.2 Gemini Analyzer
Mode: Google AI Studio System Prompt  
Fungsi: Parse input, build query, analisis listing, validasi, ranking

### 3.3 Validator
Fungsi: Deteksi iklan mencurigakan berdasarkan 8 kriteria red flag

### 3.4 Output Formatter
Fungsi: Format JSON terstruktur + Markdown report untuk user

---

## 4. Konfigurasi API Keys

```python
# config.py — JANGAN commit file ini ke Git!
# Simpan di .env atau environment variables

API_KEYS = {
    "scrapingant": "ISI_SCRAPINGANT_KEY",     # dari: scrapingant.com
    "firecrawl":   "fc-ISI_FIRECRAWL_KEY",    # dari: firecrawl.dev
    "scrapedo":    "ISI_SCRAPEDO_TOKEN",       # dari: scrape.do
    "scraperapi":  "ISI_SCRAPERAPI_KEY",       # dari: scraperapi.com
    "mrscraper":   "ISI_MRSCRAPER_TOKEN",      # dari: app.mrscraper.com/api-tokens
    "gemini":      "ISI_GEMINI_API_KEY",       # dari: aistudio.google.com
}

# Scraper ID untuk Mr. Scraper (dibuat manual di dashboard)
MRSCRAPER_SCRAPER_ID = "ISI_SCRAPER_ID"
```

### Cara Dapat API Key Masing-masing
| Tool | URL Daftar | URL API Key | Free Tier |
|---|---|---|---|
| ScrapingAnt | scrapingant.com | dashboard → API | 10.000/bulan |
| Firecrawl | firecrawl.dev | dashboard → API Keys | 1.000/bulan |
| Scrape.do | scrape.do | dashboard → Token | 1.000/bulan |
| ScraperAPI | scraperapi.com | dashboard | 5.000 trial + 1.000/bln |
| Mr. Scraper | app.mrscraper.com | /api-tokens | Terbatas |
| Gemini | aistudio.google.com | Get API Key | Free quota |

---

## 5. System Prompt Gemini

### Versi Produksi (Copy-paste ke System Instructions di AI Studio)

```
SYSTEM INSTRUCTIONS:

Kamu adalah agen pencari sewa rumah cerdas bernama "RumahFinder AI".
Tugasmu membantu user menemukan dan mengevaluasi iklan sewa rumah dari data yang diberikan.

=== CARA KERJA ===
Ketika user memberikan permintaan sewa rumah, kamu akan:
1. Ekstrak parameter pencarian (lokasi, budget, kebutuhan)
2. Berikan URL siap pakai untuk dicopy user ke browser
3. Analisis data listing yang di-paste user
4. Berikan rekomendasi terstruktur dengan skor validitas

=== PARAMETER YANG KAMU EKSTRAK ===
- Lokasi target (kota, kecamatan, dekat fasilitas apa)
- Budget maksimal per bulan (Rp)
- Jumlah kamar tidur minimum
- Fasilitas wajib (garasi, dapur, AC, dll)
- Tipe penghuni (keluarga, single, kost)

=== FORMAT URL YANG KAMU BERIKAN ===
Selalu berikan link pencarian dari platform ini:
1. OLX: https://www.olx.co.id/properti/rumah-disewa_c5080
2. Rumah123: https://www.rumah123.com/sewa/rumah/
3. 99.co: https://www.99.co/id/sewa/rumah
4. Mamikos: https://mamikos.com/pencarian/

=== CARA ANALISIS LISTING ===
Ketika user paste data listing, analisis setiap item berdasarkan:

SKOR VALIDITAS (0-100):
- Kelengkapan info: judul jelas, harga tertera, alamat lengkap (+30 poin)
- Foto tersedia dan banyak (+20 poin)
- Deskripsi detail >100 kata (+20 poin)
- Kontak valid format Indonesia (+15 poin)
- Posting baru <30 hari (+15 poin)

RED FLAGS (kurangi 30 poin per item):
- Harga <50% rata-rata area → SUSPICIOUS
- Deskripsi <30 kata → SUSPICIOUS
- Tidak ada foto → SUSPICIOUS
- Ada kata: "transfer dulu", "DP ringan tanpa survei", "hubungi cepat sebelum diambil orang"
- Nomor telepon tidak valid atau tidak bisa dihubungi
- Foto properti tidak konsisten dengan deskripsi

=== FORMAT OUTPUT WAJIB ===
Selalu jawab dalam format ini:

📍 RINGKASAN PENCARIAN
- Lokasi: [...]
- Budget: Rp [...]/bulan
- Kriteria: [...]

🔍 ANALISIS LISTING

[Untuk setiap listing:]
━━━━━━━━━━━━━━━━━━━━
🏠 LISTING #[N] — [Judul]
💰 Harga: Rp [...]/bulan
📍 Lokasi: [...]
✅ Skor Validitas: [X]/100
⚠️ Status: [VALID / PERLU VERIFIKASI / MENCURIGAKAN]
📋 Alasan: [2-3 kalimat mengapa layak atau tidak]
🔗 Link: [url jika ada]
━━━━━━━━━━━━━━━━━━━━

🏆 REKOMENDASI TOP 3
1. Listing #[N] — alasan singkat
2. Listing #[N] — alasan singkat
3. Listing #[N] — alasan singkat

💡 TIPS NEGOSIASI
[Berikan 2-3 poin tips spesifik berdasarkan listing yang dipilih]

=== ATURAN TAMBAHAN ===
- Selalu jawab dalam Bahasa Indonesia
- Jika data listing tidak cukup, minta user untuk menambahkan info
- Jika semua listing mencurigakan, beritahu user dengan jelas dan sarankan platform lain
- Hitung estimasi biaya total (deposit biasanya 2-3 bulan) jika diminta
- Temperature ideal: 0.2 (deterministik untuk analisis data)
```

### Prompt Follow-up yang Tersedia

```
# Estimasi Biaya Total
Berdasarkan listing [X] yang dipilih, hitung estimasi biaya lengkap:
- Deposit (biasanya 2-3 bulan sewa)
- Biaya pindahan estimasi
- Utilitas rata-rata (listrik, air, internet) untuk area tersebut
- Total pengeluaran bulan pertama
- Total pengeluaran 1 tahun pertama
Tampilkan dalam tabel yang jelas.

# Panduan Negosiasi
Berdasarkan listing yang dipilih, buatkan script negosiasi lengkap:
- Pembuka percakapan yang sopan
- 3 alasan logis untuk minta diskon
- Target harga nego yang realistis
- Respons jika pemilik menolak diskon
- Pertanyaan wajib sebelum setuju

# Cek Kelengkapan Dokumen
Buatkan checklist dokumen sebelum tanda tangan kontrak sewa:
- Dokumen dari pihak penyewa
- Dokumen yang harus diminta dari pemilik
- Poin penting yang harus ada di kontrak
- Red flag dalam kontrak yang harus dihindari
```

---

## 6. Scraper API — Detail & Code

### 6.1 ScrapingAnt (Utama)

**Endpoint:** `https://api.scrapingant.com/v2/general`  
**Auth:** Query param `x-api-key`  
**Cost:** 10 kredit/request (JS rendering default), 1 kredit (tanpa JS)  
**Free:** 10.000 kredit/bulan

```python
def scrape_scrapingant(url: str, api_key: str) -> str:
    """
    Scrape URL menggunakan ScrapingAnt.
    Return: HTML string atau raise Exception
    
    Catatan bug umum:
    - Jika return kosong, coba tambahkan wait_for_selector
    - Jika 403, kemungkinan site block — ganti ke residential proxy
    - Cost 10 kredit default (headless browser), set browser=false untuk 1 kredit
    """
    import requests
    response = requests.get(
        "https://api.scrapingant.com/v2/general",
        params={
            "url": url,
            "x-api-key": api_key,
            "return_page_source": "true",
            # "browser": "false",  # Uncomment untuk hemat kredit (site statis)
        },
        timeout=60
    )
    if response.status_code == 200:
        return response.text
    elif response.status_code == 422:
        raise Exception("ScrapingAnt: Kredit habis atau URL tidak valid")
    elif response.status_code == 403:
        raise Exception("ScrapingAnt: Site memblock scraper, coba residential proxy")
    else:
        raise Exception(f"ScrapingAnt error {response.status_code}: {response.text[:200]}")
```

### 6.2 Firecrawl (Output Markdown Terbaik)

**Endpoint:** `https://api.firecrawl.dev/v1/scrape`  
**Auth:** Bearer token di header  
**Cost:** 1 kredit/halaman (basic), lebih untuk JS berat  
**Free:** 1.000 kredit/bulan (recurring)  
**Kelebihan:** Output Markdown langsung, hemat token saat dikirim ke Gemini

```python
def scrape_firecrawl(url: str, api_key: str) -> str:
    """
    Scrape URL menggunakan Firecrawl.
    Return: Markdown string (bukan HTML!) atau raise Exception
    
    Catatan bug umum:
    - Output adalah Markdown, bukan HTML — jangan parse sebagai HTML
    - Jika site JS-heavy dan gagal, aktifkan actions
    - 1 kredit = 1 halaman basic, AI extraction = 5 kredit
    """
    import requests
    response = requests.post(
        "https://api.firecrawl.dev/v1/scrape",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        json={
            "url": url,
            "formats": ["markdown"],
            "onlyMainContent": True,  # Hilangkan nav, footer, iklan
        },
        timeout=60
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("data", {}).get("markdown", "")
    elif response.status_code == 402:
        raise Exception("Firecrawl: Kredit habis")
    elif response.status_code == 429:
        raise Exception("Firecrawl: Rate limit, tunggu 60 detik")
    else:
        raise Exception(f"Firecrawl error {response.status_code}: {response.text[:200]}")
```

### 6.3 Scrape.do (Success Rate Tertinggi)

**Endpoint:** `https://api.scrape.do`  
**Auth:** Query param `token`  
**Cost:** 1 kredit basic, 5 kredit JS, 25 kredit JS + residential  
**Free:** 1.000 kredit/bulan (recurring)

```python
def scrape_scrapedo(url: str, token: str) -> str:
    """
    Scrape URL menggunakan Scrape.do.
    Return: HTML string atau raise Exception
    
    Catatan bug umum:
    - Untuk JS rendering, wajib tambah render=true
    - Untuk Cloudflare bypass, tambah super=true (lebih mahal kredit)
    """
    import requests
    response = requests.get(
        "https://api.scrape.do",
        params={
            "token": token,
            "url": url,
            "render": "true",
        },
        timeout=90
    )
    if response.status_code == 200:
        return response.text
    elif response.status_code == 401:
        raise Exception("Scrape.do: Token tidak valid")
    elif response.status_code == 429:
        raise Exception("Scrape.do: Kredit habis atau rate limit")
    else:
        raise Exception(f"Scrape.do error {response.status_code}: {response.text[:200]}")
```

### 6.4 ScraperAPI (Cadangan)

**Endpoint:** `https://api.scraperapi.com`  
**Auth:** Query param `api_key`  
**Cost:** 1 kredit basic, 5 kredit JS  
**Free:** 5.000 trial + 1.000/bulan

```python
def scrape_scraperapi(url: str, api_key: str) -> str:
    """
    Scrape URL menggunakan ScraperAPI.
    Return: HTML string atau raise Exception
    
    Catatan bug umum:
    - Default tidak render JS, tambah render=true untuk site dinamis
    - Timeout bisa lama (25-30 detik untuk site berat), set timeout=120
    """
    import requests
    response = requests.get(
        "https://api.scraperapi.com",
        params={
            "api_key": api_key,
            "url": url,
            "render": "true",
        },
        timeout=120  # ScraperAPI bisa lambat
    )
    if response.status_code == 200:
        return response.text
    elif response.status_code == 403:
        raise Exception("ScraperAPI: API key tidak valid atau kredit habis")
    else:
        raise Exception(f"ScraperAPI error {response.status_code}: {response.text[:200]}")
```

### 6.5 Mr. Scraper (AI Schema Extraction)

**Endpoint AI:** `https://app.mrscraper.com/api/ai`  
**Endpoint Rerun:** `https://api.app.mrscraper.com/api/v1/scrapers-ai-rerun`  
**Auth:** Bearer token (API) atau x-api-token (Rerun)  
**Setup:** Wajib buat scraper di dashboard dulu, aktifkan API mode di Settings

```python
def scrape_mrscraper_ai(url: str, api_token: str, schema: dict) -> list:
    """
    Scrape dengan AI extraction menggunakan Mr. Scraper.
    Return: List of dict sesuai schema, atau raise Exception
    
    Catatan bug umum:
    - Wajib aktifkan "AI Scraper API Access" di Settings scraper dulu
    - Schema harus valid JSON Schema format
    - Timeout bisa sampai 180 detik — ini normal
    - Jika result kosong [], kemungkinan site block atau schema tidak cocok
    """
    import requests
    response = requests.post(
        "https://app.mrscraper.com/api/ai",
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_token}"
        },
        json={
            "urls": [url],
            "min": 5,
            "max": 20,
            "timeout": 180,
            "schema": schema
        },
        timeout=200
    )
    if response.status_code == 200:
        return response.json().get("result", [])
    elif response.status_code == 401:
        raise Exception("Mr. Scraper: Token tidak valid")
    elif response.status_code == 429:
        raise Exception("Mr. Scraper: Kredit habis")
    else:
        raise Exception(f"Mr. Scraper error {response.status_code}: {response.text[:200]}")
```

---

## 7. Script Utama End-to-End

### scraper_router.py

```python
"""
Scraper Router — otomatis rotasi ke scraper berikutnya jika gagal.
Urutan: ScrapingAnt → Firecrawl → Scrape.do → ScraperAPI → Mr. Scraper
"""

import requests
import time
import logging
from typing import Optional

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

# === KONFIGURASI ===
# Isi dengan API key yang sudah didapat
API_KEYS = {
    "scrapingant": "ISI_SCRAPINGANT_KEY",
    "firecrawl":   "fc-ISI_FIRECRAWL_KEY",
    "scrapedo":    "ISI_SCRAPEDO_TOKEN",
    "scraperapi":  "ISI_SCRAPERAPI_KEY",
    "mrscraper":   "ISI_MRSCRAPER_TOKEN",
}

def _try_scrapingant(url: str) -> str:
    r = requests.get("https://api.scrapingant.com/v2/general", params={
        "url": url, "x-api-key": API_KEYS["scrapingant"], "return_page_source": "true"
    }, timeout=60)
    r.raise_for_status()
    return r.text

def _try_firecrawl(url: str) -> str:
    r = requests.post("https://api.firecrawl.dev/v1/scrape",
        headers={"Authorization": f"Bearer {API_KEYS['firecrawl']}"},
        json={"url": url, "formats": ["markdown"], "onlyMainContent": True},
        timeout=60)
    r.raise_for_status()
    return r.json().get("data", {}).get("markdown", "")

def _try_scrapedo(url: str) -> str:
    r = requests.get("https://api.scrape.do", params={
        "token": API_KEYS["scrapedo"], "url": url, "render": "true"
    }, timeout=90)
    r.raise_for_status()
    return r.text

def _try_scraperapi(url: str) -> str:
    r = requests.get("https://api.scraperapi.com", params={
        "api_key": API_KEYS["scraperapi"], "url": url, "render": "true"
    }, timeout=120)
    r.raise_for_status()
    return r.text

def scrape(url: str, retry_delay: int = 3) -> Optional[str]:
    """
    Coba scrape URL dengan fallback otomatis.
    Return: konten HTML/Markdown atau None jika semua gagal.
    """
    scrapers = [
        ("ScrapingAnt", _try_scrapingant),
        ("Firecrawl",   _try_firecrawl),
        ("Scrape.do",   _try_scrapedo),
        ("ScraperAPI",  _try_scraperapi),
    ]
    for nama, fungsi in scrapers:
        try:
            log.info(f"Mencoba {nama} untuk: {url}")
            hasil = fungsi(url)
            if hasil and len(hasil) > 500:  # Validasi hasil tidak kosong
                log.info(f"✅ Berhasil dengan {nama} ({len(hasil)} chars)")
                return hasil
            else:
                log.warning(f"{nama}: Hasil terlalu pendek ({len(hasil) if hasil else 0} chars)")
        except Exception as e:
            log.warning(f"❌ {nama} gagal: {e}")
            time.sleep(retry_delay)
    log.error("Semua scraper gagal!")
    return None
```

### gemini_analyzer.py

```python
"""
Gemini Analyzer — kirim konten ke Gemini API untuk dianalisis.
"""

import requests
import json

GEMINI_API_KEY = "ISI_GEMINI_API_KEY"
GEMINI_MODEL   = "gemini-1.5-pro"
GEMINI_URL     = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

SYSTEM_PROMPT = """
Kamu adalah analis iklan sewa rumah. Dari konten HTML atau Markdown yang diberikan,
ekstrak semua listing sewa rumah dan kembalikan HANYA JSON array berikut (tanpa teks lain):

[
  {
    "judul": "string",
    "harga_per_bulan": number,
    "mata_uang": "IDR",
    "lokasi": "string",
    "alamat_detail": "string atau null",
    "kamar_tidur": number atau null,
    "kamar_mandi": number atau null,
    "luas_m2": number atau null,
    "fasilitas": ["list string"],
    "deskripsi": "string",
    "kontak": "string atau null",
    "foto_count": number atau null,
    "tanggal_posting": "string atau null",
    "url_listing": "string atau null",
    "sumber_platform": "OLX/Rumah123/99.co/Mamikos/lainnya"
  }
]

Aturan:
- Jika harga tidak ditemukan, gunakan null
- Jangan tambahkan field yang tidak ada di schema
- Jika tidak ada listing ditemukan, return array kosong []
- Pastikan harga_per_bulan adalah angka murni (tanpa Rp, titik, koma)
"""

def analisis_listing(konten: str, kriteria_user: dict) -> list:
    """
    Kirim konten scraping ke Gemini untuk ekstraksi listing.
    Return: list of dict listing atau []
    
    Catatan bug umum:
    - Jika Gemini return bukan JSON valid, cek apakah ada markdown fences (```json)
    - Jika response kosong, kemungkinan konten terlalu panjang — truncate ke 50.000 chars
    - Rate limit Gemini free tier: 60 req/menit
    """
    # Truncate konten jika terlalu panjang (Gemini ada context limit)
    konten_truncated = konten[:50000] if len(konten) > 50000 else konten
    
    payload = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{
            "parts": [{
                "text": f"""Kriteria pencarian user:
- Lokasi target: {kriteria_user.get('lokasi', 'tidak ditentukan')}
- Budget max: Rp {kriteria_user.get('budget_max', 'tidak ditentukan')}/bulan
- Kamar tidur min: {kriteria_user.get('kamar_tidur_min', 'tidak ditentukan')}
- Fasilitas wajib: {kriteria_user.get('fasilitas', [])}

Konten halaman untuk dianalisis:
{konten_truncated}"""
            }]
        }],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json"
        }
    }
    
    response = requests.post(
        f"{GEMINI_URL}?key={GEMINI_API_KEY}",
        headers={"Content-Type": "application/json"},
        json=payload,
        timeout=60
    )
    
    if response.status_code != 200:
        raise Exception(f"Gemini error {response.status_code}: {response.text[:300]}")
    
    teks = response.json()["candidates"][0]["content"]["parts"][0]["text"]
    
    # Bersihkan markdown fences jika ada
    teks = teks.strip()
    if teks.startswith("```"):
        teks = teks.split("```")[1]
        if teks.startswith("json"):
            teks = teks[4:]
    
    try:
        return json.loads(teks)
    except json.JSONDecodeError as e:
        raise Exception(f"Gagal parse JSON dari Gemini: {e}\nTeks: {teks[:500]}")
```

### validator.py

```python
"""
Validator — scoring dan deteksi red flag iklan sewa rumah.
"""

import re

def hitung_skor(listing: dict, harga_median_area: float = None) -> dict:
    """
    Hitung skor validitas listing (0-100) dan deteksi red flags.
    Return: dict dengan 'skor', 'status', 'red_flags', 'catatan'
    """
    skor = 0
    red_flags = []
    catatan = []

    # === SCORING POSITIF ===
    
    # Kelengkapan info dasar (+30)
    if listing.get("judul") and listing.get("harga_per_bulan") and listing.get("lokasi"):
        skor += 30
    else:
        red_flags.append("Info dasar tidak lengkap (judul/harga/lokasi)")

    # Foto tersedia (+20)
    foto = listing.get("foto_count")
    if foto and foto >= 3:
        skor += 20
    elif foto and foto >= 1:
        skor += 10
        catatan.append("Foto sedikit (kurang dari 3)")
    else:
        red_flags.append("Tidak ada foto")

    # Deskripsi detail (+20)
    deskripsi = listing.get("deskripsi", "") or ""
    kata_count = len(deskripsi.split())
    if kata_count >= 100:
        skor += 20
    elif kata_count >= 50:
        skor += 10
        catatan.append(f"Deskripsi singkat ({kata_count} kata)")
    else:
        red_flags.append(f"Deskripsi terlalu singkat ({kata_count} kata)")

    # Kontak valid (+15)
    kontak = listing.get("kontak", "") or ""
    # Format nomor Indonesia: 08xx, +628xx, 628xx
    if re.search(r'(08\d{8,11}|\+628\d{8,11}|628\d{8,11})', kontak.replace(" ", "").replace("-", "")):
        skor += 15
    elif kontak:
        skor += 5
        catatan.append("Format kontak tidak standar Indonesia")
    else:
        red_flags.append("Tidak ada kontak")

    # Posting baru (+15)
    tanggal = listing.get("tanggal_posting", "") or ""
    if any(kata in tanggal.lower() for kata in ["hari ini", "kemarin", "jam", "menit", "1 hari", "2 hari", "3 hari"]):
        skor += 15
    elif any(kata in tanggal.lower() for kata in ["minggu", "week"]):
        skor += 8
    elif tanggal:
        skor += 3

    # === RED FLAGS ===

    # Harga terlalu murah
    harga = listing.get("harga_per_bulan")
    if harga and harga_median_area:
        if harga < harga_median_area * 0.5:
            red_flags.append(f"Harga sangat murah (Rp {harga:,.0f} vs median Rp {harga_median_area:,.0f})")
            skor -= 30

    # Kata-kata penipuan
    deskripsi_lower = deskripsi.lower()
    kata_penipuan = [
        "transfer dulu", "dp dulu", "tanpa survei", "tanpa kunjungan",
        "hubungi segera", "ambil sebelum", "harga negosasi", 
        "sedang di luar negeri", "kirim kunci", "bayar via transfer"
    ]
    for kata in kata_penipuan:
        if kata in deskripsi_lower:
            red_flags.append(f"Kata mencurigakan: '{kata}'")
            skor -= 25
            break  # Cukup satu flag untuk kategori ini

    # Harga di bawah ambang batas minimum (terlalu murah untuk daerah manapun)
    if harga and harga < 500000:
        red_flags.append(f"Harga tidak realistis: Rp {harga:,.0f}/bulan")
        skor -= 30

    # === TENTUKAN STATUS ===
    skor = max(0, min(100, skor))  # Clamp 0-100
    
    if skor >= 70 and not red_flags:
        status = "VALID"
    elif skor >= 50 or (skor >= 40 and len(red_flags) <= 1):
        status = "PERLU VERIFIKASI"
    else:
        status = "MENCURIGAKAN"

    return {
        "skor": skor,
        "status": status,
        "red_flags": red_flags,
        "catatan": catatan
    }
```

### main.py (Pipeline Lengkap)

```python
"""
Pipeline utama RumahFinder AI.
Jalankan: python main.py
"""

from scraper_router import scrape
from gemini_analyzer import analisis_listing
from validator import hitung_skor
import json

# Median harga sewa per area (Rp/bulan) — update berkala
MEDIAN_HARGA = {
    "jakarta selatan": 8_000_000,
    "jakarta pusat":   9_000_000,
    "jakarta barat":   6_000_000,
    "jakarta utara":   5_500_000,
    "jakarta timur":   5_000_000,
    "bandung":         4_000_000,
    "surabaya":        4_500_000,
    "default":         5_000_000,
}

def cari_sewa_rumah(kriteria: dict) -> list:
    """
    Pipeline utama. 
    
    kriteria = {
        "lokasi": "Kemang, Jakarta Selatan",
        "budget_max": 7000000,
        "kamar_tidur_min": 2,
        "fasilitas": ["garasi"],
        "tipe_penghuni": "keluarga"
    }
    
    Return: list listing tervalidasi dan diranking
    """
    # 1. Build URL pencarian
    lokasi_encoded = kriteria["lokasi"].replace(" ", "+")
    urls = [
        f"https://www.olx.co.id/properti/rumah-disewa_c5080?search[filter_float_price:to]={kriteria['budget_max']}&search[description]={lokasi_encoded}",
        f"https://www.rumah123.com/sewa/{kriteria['lokasi'].lower().replace(' ', '-').replace(',', '')}/rumah/",
    ]
    
    semua_listing = []
    
    for url in urls:
        print(f"\n🔍 Scraping: {url}")
        konten = scrape(url)
        
        if not konten:
            print(f"⚠️ Gagal scrape URL: {url}")
            continue
        
        # 2. Analisis dengan Gemini
        listing_baru = analisis_listing(konten, kriteria)
        print(f"📋 Ditemukan {len(listing_baru)} listing dari {url}")
        semua_listing.extend(listing_baru)
    
    if not semua_listing:
        print("❌ Tidak ada listing ditemukan dari semua URL")
        return []
    
    # 3. Validasi dan scoring
    area_key = next((k for k in MEDIAN_HARGA if k in kriteria["lokasi"].lower()), "default")
    median = MEDIAN_HARGA[area_key]
    
    for listing in semua_listing:
        hasil_validasi = hitung_skor(listing, median)
        listing.update(hasil_validasi)
    
    # 4. Filter listing mencurigakan dan ranking
    listing_valid = [l for l in semua_listing if l["status"] != "MENCURIGAKAN"]
    listing_ranked = sorted(listing_valid, key=lambda x: x["skor"], reverse=True)
    
    return listing_ranked[:10]  # Return top 10

def format_output(listings: list) -> str:
    """Format hasil menjadi teks yang mudah dibaca."""
    if not listings:
        return "❌ Tidak ada listing valid ditemukan."
    
    output = f"🏆 DITEMUKAN {len(listings)} LISTING VALID\n"
    output += "=" * 50 + "\n\n"
    
    for i, l in enumerate(listings[:5], 1):
        output += f"#{i} {'⭐' if l['skor'] >= 80 else ''} {l.get('judul', 'Tanpa Judul')}\n"
        output += f"   💰 Rp {l.get('harga_per_bulan', 0):,.0f}/bulan\n"
        output += f"   📍 {l.get('lokasi', '-')}\n"
        output += f"   ✅ Skor: {l.get('skor', 0)}/100 ({l.get('status', '-')})\n"
        if l.get("red_flags"):
            output += f"   ⚠️ {', '.join(l['red_flags'][:2])}\n"
        output += f"   🔗 {l.get('url_listing', 'URL tidak tersedia')}\n\n"
    
    return output

if __name__ == "__main__":
    kriteria = {
        "lokasi": "Jakarta Selatan",
        "budget_max": 7_000_000,
        "kamar_tidur_min": 2,
        "fasilitas": ["garasi"],
        "tipe_penghuni": "keluarga"
    }
    
    hasil = cari_sewa_rumah(kriteria)
    print(format_output(hasil))
    
    # Simpan hasil ke file JSON
    with open("hasil_pencarian.json", "w", encoding="utf-8") as f:
        json.dump(hasil, f, ensure_ascii=False, indent=2)
    print("\n💾 Hasil disimpan ke hasil_pencarian.json")
```

---

## 8. Format Data & Schema

### Schema Listing (JSON)

```json
{
  "judul": "Rumah 3KT di Kemang, Jakarta Selatan",
  "harga_per_bulan": 7500000,
  "mata_uang": "IDR",
  "lokasi": "Kemang, Jakarta Selatan",
  "alamat_detail": "Jl. Kemang Raya No.12",
  "kamar_tidur": 3,
  "kamar_mandi": 2,
  "luas_m2": 120,
  "fasilitas": ["garasi", "dapur", "AC", "water heater"],
  "deskripsi": "Rumah 2 lantai kondisi baik...",
  "kontak": "08123456789",
  "foto_count": 8,
  "tanggal_posting": "2 hari lalu",
  "url_listing": "https://www.olx.co.id/...",
  "sumber_platform": "OLX",
  "skor": 85,
  "status": "VALID",
  "red_flags": [],
  "catatan": []
}
```

### Schema Mr. Scraper (untuk AI extraction)

```json
{
  "type": "array",
  "description": "Daftar listing sewa rumah",
  "items": {
    "type": "object",
    "properties": {
      "judul":           {"type": "string",  "description": "judul iklan properti"},
      "harga":           {"type": "number",  "description": "harga sewa per bulan dalam rupiah"},
      "lokasi":          {"type": "string",  "description": "alamat atau area properti"},
      "kamar_tidur":     {"type": "number",  "description": "jumlah kamar tidur"},
      "deskripsi":       {"type": "string",  "description": "deskripsi properti"},
      "kontak":          {"type": "string",  "description": "nomor telepon penjual"},
      "url_listing":     {"type": "string",  "description": "url lengkap iklan"},
      "tanggal_posting": {"type": "string",  "description": "kapan iklan diposting"}
    },
    "required": ["judul", "harga", "lokasi", "url_listing"]
  }
}
```

---

## 9. Logika Validasi Iklan

### Scoring Positif (Total maksimal 100 poin)

| Kriteria | Poin | Catatan |
|---|---|---|
| Judul + harga + lokasi lengkap | +30 | Wajib ada ketiganya |
| Foto ≥ 3 | +20 | Foto 1-2 dapat +10 |
| Deskripsi ≥ 100 kata | +20 | 50-99 kata dapat +10 |
| Nomor HP format Indonesia | +15 | Format 08xx / +628xx |
| Posting ≤ 3 hari | +15 | Seminggu dapat +8 |

### Red Flags (Kurangi poin)

| Red Flag | Poin | Keterangan |
|---|---|---|
| Tidak ada foto | -0 (flag saja) | Kurangi skor dari kategori foto |
| Harga < 50% median area | -30 | Bandingkan dengan MEDIAN_HARGA |
| Kata penipuan di deskripsi | -25 | "transfer dulu", "tanpa survei", dll |
| Harga < Rp 500.000 | -30 | Tidak realistis untuk sewa rumah |
| Deskripsi < 30 kata | -0 (flag saja) | Skor deskripsi 0 |

### Threshold Status
- **VALID**: Skor ≥ 70 DAN tidak ada red flags
- **PERLU VERIFIKASI**: Skor 40-69 ATAU red flag ≤ 1
- **MENCURIGAKAN**: Skor < 40 ATAU red flag > 1

---

## 10. URL Target Scraping

### OLX (Utama)

```
# Template URL OLX dengan filter
Base: https://www.olx.co.id/properti/rumah-disewa_c5080

Parameter:
- search[description] = kata kunci lokasi (URL encoded)
- search[filter_float_price:from] = harga minimum
- search[filter_float_price:to] = harga maksimum

Contoh:
# Jakarta Selatan, max 7 juta
https://www.olx.co.id/properti/rumah-disewa_c5080?search[filter_float_price:to]=7000000&search[description]=jakarta+selatan

# Bandung, 2-5 juta
https://www.olx.co.id/properti/rumah-disewa_c5080?search[filter_float_price:from]=2000000&search[filter_float_price:to]=5000000&search[description]=bandung
```

### Rumah123

```
# Template
https://www.rumah123.com/sewa/{kota}/{tipe-properti}/

Contoh:
https://www.rumah123.com/sewa/jakarta-selatan/rumah/
https://www.rumah123.com/sewa/bandung/rumah/
```

### 99.co

```
https://www.99.co/id/sewa/rumah?query={lokasi}
```

### Mamikos (Kos/Rumah)

```
https://mamikos.com/pencarian/{kota}/?tipe=all
```

---

## 11. Troubleshooting & Bug Fixing

### Bug Umum dan Solusinya

#### 🔴 Error: Semua scraper gagal (return None)
**Penyebab:** Site memblock semua scraper, atau URL tidak valid  
**Solusi:**
1. Test URL target di browser manual dulu
2. Coba ganti URL ke halaman listing yang berbeda
3. Aktifkan residential proxy di ScrapingAnt atau Scrape.do
4. Coba platform lain (OLX → Rumah123 → 99.co)

```python
# Debug: test satu scraper secara manual
import requests
r = requests.get("https://api.scrapingant.com/v2/general", params={
    "url": "URL_TARGET",
    "x-api-key": "API_KEY",
    "return_page_source": "true"
}, timeout=60)
print(r.status_code)
print(r.text[:2000])
```

#### 🔴 Error: Gemini return bukan JSON valid
**Penyebab:** Gemini kadang tambahkan teks sebelum/sesudah JSON  
**Solusi:** Gunakan parser yang sudah handle markdown fences (sudah ada di `gemini_analyzer.py`)

```python
# Tambahan defense jika masih error:
import re
def clean_json(teks: str) -> str:
    # Hapus semua sebelum [ atau {
    match = re.search(r'[\[{]', teks)
    if match:
        teks = teks[match.start():]
    # Hapus semua sesudah ] atau }
    match = re.search(r'[\]}](?=[^}\]]*$)', teks)
    if match:
        teks = teks[:match.end()]
    return teks
```

#### 🔴 Error: Hasil listing kosong []
**Penyebab:** Konten HTML tidak mengandung listing, atau Gemini gagal ekstrak  
**Solusi:**
1. Print 2000 karakter pertama konten scraping untuk debug
2. Cek apakah site perlu JS rendering
3. Cek apakah struktur HTML berubah

```python
konten = scrape(url)
print("=== DEBUG KONTEN ===")
print(konten[:2000] if konten else "KONTEN KOSONG")
```

#### 🔴 Error: 422 dari ScrapingAnt
**Penyebab:** Kredit habis atau URL format salah  
**Solusi:** Cek dashboard scrapingant.com untuk sisa kredit

#### 🔴 Error: Timeout di ScraperAPI (> 120 detik)
**Penyebab:** Site terlalu berat untuk dirender  
**Solusi:** Nonaktifkan JS rendering (`render=false`) untuk mencoba versi statis

#### 🔴 Error: Skor semua listing 0
**Penyebab:** Field dari Gemini tidak match dengan yang diexpect validator  
**Solusi:** Print listing mentah dan cek nama field

```python
for l in listings_mentah:
    print(l.keys())  # Cek nama field yang actual
```

### Checklist Debug Sistematis

```
[ ] 1. API key valid? → test dengan curl sederhana
[ ] 2. URL target bisa diakses? → buka di browser
[ ] 3. Scraper return konten? → print len(konten)
[ ] 4. Konten mengandung data listing? → print konten[:3000]
[ ] 5. Gemini bisa parse? → test dengan konten kecil dulu
[ ] 6. JSON valid? → json.loads() tanpa error?
[ ] 7. Field nama match? → print listing.keys()
[ ] 8. Validator jalan? → test hitung_skor() dengan data dummy
```

---

## 12. Batasan & Kuota Gratis

### Tabel Kuota Per Tool (Per Bulan)

| Tool | Kredit Gratis | Reset | Efektif Halaman JS | Catatan |
|---|---|---|---|---|
| ScrapingAnt | 10.000 | Bulanan | ~1.000 | Default 10 kredit/req |
| Firecrawl | 1.000 | Bulanan | ~1.000 | 1 kredit/halaman, output MD |
| Scrape.do | 1.000 | Bulanan | ~200 | 5 kredit/req JS |
| ScraperAPI | 1.000 | Bulanan | ~200 | 5 kredit/req JS |
| Mr. Scraper | Terbatas | - | Varies | AI extraction, cek dashboard |
| **Total** | **~13.000+** | **Bulanan** | **~2.400 halaman** | Pakai semua paralel |

### Strategi Hemat Kredit
1. **Firecrawl dulu** untuk halaman statis (1 kredit/req, output langsung Markdown)
2. **ScrapingAnt** untuk halaman yang butuh JS (10 kredit tapi paling banyak kuota)
3. **Jangan aktifkan residential proxy** kecuali benar-benar diblock (50-250x lebih mahal)
4. **Cache hasil** — simpan hasil scraping ke file JSON, jangan re-scrape URL yang sama

```python
# Simple caching
import os, json, hashlib, time

def scrape_dengan_cache(url: str, max_age_jam: int = 24) -> str:
    cache_key = hashlib.md5(url.encode()).hexdigest()
    cache_file = f"cache/{cache_key}.json"
    
    # Cek cache
    if os.path.exists(cache_file):
        data = json.load(open(cache_file))
        usia_jam = (time.time() - data["timestamp"]) / 3600
        if usia_jam < max_age_jam:
            return data["konten"]
    
    # Scrape baru
    konten = scrape(url)
    if konten:
        os.makedirs("cache", exist_ok=True)
        json.dump({"timestamp": time.time(), "konten": konten}, open(cache_file, "w"))
    return konten
```

---

## 13. Roadmap Pengembangan

### ✅ Fase 1 (Selesai / Didokumentasikan)
- [x] Multi-scraper router dengan fallback otomatis
- [x] System prompt Gemini untuk analisis listing
- [x] Validasi iklan dengan scoring 0-100
- [x] Format output terstruktur

### 🔄 Fase 2 (Prioritas Berikutnya)
- [ ] **Notifikasi otomatis**: Kirim listing baru ke WhatsApp/Telegram
- [ ] **Scheduled scraping**: Jalankan otomatis setiap 6 jam via cron job
- [ ] **Simpan ke database**: SQLite atau Google Sheets untuk histori
- [ ] **Perbandingan harga otomatis**: Update median harga dari data aktual

### 🔮 Fase 3 (Nice to Have)
- [ ] **Web UI sederhana**: Form input kriteria, tampilkan hasil di browser
- [ ] **Foto downloader**: Download foto listing untuk verifikasi visual
- [ ] **Integrasi Maps**: Hitung jarak dari titik yang diinginkan user
- [ ] **Price trend**: Grafik pergerakan harga per area dari waktu ke waktu

---

## Catatan untuk Gemini saat Rebuild / Bug Fix

Ketika diminta untuk rebuild atau fix bug sistem ini, perhatikan:

1. **Jangan ubah schema JSON** tanpa update validator.py sekaligus
2. **Urutan scraper router** sudah dioptimasi berdasarkan kuota — jangan diubah sembarangan
3. **Truncate konten ke 50.000 karakter** sebelum kirim ke Gemini — context window terbatas
4. **Test unit per komponen** sebelum test end-to-end (scraper → analyzer → validator)
5. **Selalu handle None** dari fungsi scrape() — bisa return None jika semua gagal
6. **Harga dalam integer/float murni** — tanpa "Rp", titik ribu, atau simbol apapun

---

*Dokumen ini dibuat untuk memudahkan rebuild dan debugging sistem RumahFinder AI.*  
*Update dokumen ini setiap kali ada perubahan signifikan pada arsitektur atau konfigurasi.*