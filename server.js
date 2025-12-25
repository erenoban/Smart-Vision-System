import express from "express";
import fileUpload from "express-fileupload";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as gTTS from "google-tts-api";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import sharp from "sharp";
import fs from "fs";

// Dosya yollarını ayarlama
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- GÜVENLİK NOTU: API Anahtarını buraya yapıştır veya .env kullan ---
const GEMINI_API_KEY = "BURAYA_API_ANAHTARINI_YAZ"; 

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Model ismi güncellendi

const SERVER_IP = "192.168.137.1"; // Kendi yerel IP adresin
const PORT = 3000;

sharp.cache(false);
const app = express();

// CORS Ayarları
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
  abortOnLimit: true,
}));

app.use(express.static(path.join(__dirname, "public")));

const ttsConfig = {
  lang: "tr",
  slow: false,
  host: "https://translate.google.com",
};

// Yazıyı parçalara bölüp ses linki üreten fonksiyon
function generateTtsData(message) {
  const ttsText = prepareForTTS(message);
  const textChunks = splitText(ttsText, 180);

  const audioData = textChunks.map((chunk) => {
    const googleUrl = gTTS.getAudioUrl(chunk, ttsConfig);
    return {
      url: `http://${SERVER_IP}:${PORT}/stream?url=${encodeURIComponent(googleUrl)}`,
      shortText: chunk,
    };
  });

  return { text: message, audioData };
}

function prepareForTTS(text) {
  if (!text) return "";
  return text.toLocaleLowerCase("tr-TR").trim();
}

function splitText(text, maxLength = 180) {
  if (!text || text.length <= maxLength) return [text];
  const words = text.split(" ");
  const chunks = [];
  let currentChunk = "";

  for (let word of words) {
    if ((currentChunk + word + " ").length > maxLength) {
      chunks.push(currentChunk.trim());
      currentChunk = word + " ";
    } else {
      currentChunk += word + " ";
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}

// Resim Boyutlandırma
async function optimizeImage(inputPath, outputPath) {
  try {
    await sharp(inputPath)
      .resize({ width: 1024, withoutEnlargement: true, fit: "inside" }) // Hız için 1024 idealdir
      .jpeg({ quality: 80 })
      .toFile(outputPath);
    return true;
  } catch (error) {
    console.error("Resim hatası:", error.message);
    return false;
  }
}

function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: fs.readFileSync(filePath).toString("base64"),
      mimeType,
    },
  };
}

// Ses Akışı (Stream)
app.get("/stream", async (req, res) => {
  const audioUrl = req.query.url;
  if (!audioUrl) return res.status(400).send("URL eksik");
  try {
    const response = await axios({ method: "get", url: audioUrl, responseType: "stream" });
    res.set("Content-Type", "audio/mpeg");
    response.data.pipe(res);
  } catch (error) {
    res.status(500).send("Ses çekilemedi");
  }
});

// ANA OCR İŞLEMİ
app.post("/ocr", async (req, res) => {
  if (!req.files || !req.files.photo) {
    return res.status(400).json(generateTtsData("Fotoğraf gelmedi."));
  }

  const uploadsDir = path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

  const rawPath = path.join(uploadsDir, `raw_${Date.now()}.jpg`);
  const optPath = path.join(uploadsDir, `opt_${Date.now()}.jpg`);

  try {
    await req.files.photo.mv(rawPath);
    await optimizeImage(rawPath, optPath);

    const prompt = "Bu resimdeki tüm metinleri Türkçe olarak oku. Başka açıklama yapma.";
    const imagePart = fileToGenerativePart(optPath, "image/jpeg");

    const result = await model.generateContent([prompt, imagePart]);
    const extractedText = result.response.text();

    if (!extractedText || extractedText.trim().length < 2) {
      return res.json(generateTtsData("Okunacak bir yazı bulamadım."));
    }

    res.json(generateTtsData(extractedText.trim()));

  } catch (error) {
    console.error("Hata:", error.message);
    res.status(500).json(generateTtsData("Sistemde bir hata oluştu."));
  } finally {
    // Temizlik: Geçici dosyaları sil
    if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath);
    if (fs.existsSync(optPath)) fs.unlinkSync(optPath);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Gözlük API hazır: http://${SERVER_IP}:${PORT}`);
});