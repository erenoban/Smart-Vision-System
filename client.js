import axios from "axios";
import fs from "fs";
import FormData from "form-data";

// Sunucu bağlantı ayarları - Kendi sunucu IP'ni buraya yaz
const SERVER_IP = "192.168.137.1";
const PORT = 3000;
const API_URL = `http://${SERVER_IP}:${PORT}/ocr`;

/**
 * Kameradan alınan fotoğrafı sunucuya gönderen ve 
 * gelen metni/sesi yöneten ana fonksiyon.
 */
async function sendPhotoForOCR(imagePath) {
  console.log("Görüntü sunucuya gönderiliyor...");

  try {
    // 1. Dosyayı oku ve form verisi hazırla
    if (!fs.existsSync(imagePath)) {
      console.error("Hata: Gönderilecek fotoğraf dosyası bulunamadı.");
      return;
    }

    const form = new FormData();
    form.append("photo", fs.createReadStream(imagePath));

    // 2. Sunucuya POST isteği at
    const response = await axios.post(API_URL, form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 30000, // 30 saniye zaman aşımı
    });

    // 3. Yanıtı işle
    const { text, audioData } = response.data;

    console.log("─".repeat(50));
    console.log("Okunan Metin:", text);
    console.log("─".repeat(50));

    if (audioData && audioData.length > 0) {
      console.log(`${audioData.length} parça ses verisi alındı.`);
      
      // Burada gözlük hoparlöründen ses çalma komutlarını tetikleyebilirsin
      audioData.forEach((audio, index) => {
        console.log(`Ses Parçası ${index + 1} Linki: ${audio.url}`);
      });
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error("Hata: Sunucuya bağlanılamadı. IP adresini ve sunucunun açık olduğunu kontrol et.");
    } else {
      console.error("OCR İsteği Sırasında Hata Oluştu:", error.message);
    }
  }
}

// Örnek kullanım:
// sendPhotoForOCR("./kamera_goruntusu.jpg");

export { sendPhotoForOCR };