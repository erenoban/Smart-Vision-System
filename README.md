
# Akıllı Gözlük - Yapay Zeka Destekli OCR & Sesli Asistan
Bu proje, görme engelli bireyler için geliştirilmiş, çevredeki metinleri algılayıp sese dönüştüren bir Akıllı Gözlük sisteminin backend (sunucu) ve client (istemci) altyapısını içerir.
# Proje Nasıl Çalışır?
1. Gözlük (Client): Üzerindeki kamera ile bir fotoğraf çeker ve bunu sunucuya gönderir.

2. Sunucu (Server): Gelen fotoğrafı Google Gemini AI kullanarak analiz eder ve içindeki metinleri çıkarır (OCR).

3. Ses Dönüştürme: Analiz edilen metinler Türkçe sese (TTS) dönüştürülerek gözlüğe geri gönderilir.
# Teknik Özellikler
AI Motoru: Google Gemini 1.5 Flash API.

Görüntü İşleme: sharp kütüphanesi ile fotoğraflar analiz öncesi optimize edilir.

Sesli Bildirim: google-tts-api ile metinden sese dönüşüm sağlanır.

Hız ve Performans: Uzun metinler 180 karakterlik parçalara bölünerek akıcı bir okuma sağlanır.
# Dosya Yapısı
server.js: Yapay zeka analizini ve ses üretimini yöneten ana sunucu kodu.

client.js: Gözlük üzerindeki kameradan fotoğraf çekip sunucuya ileten istemci kodu.
# Yapay Zeka Destekli Akıllı Gözlük Sistemi (Node.js & AI)

Google Gemini AI kullanarak görsellerden metin çıkarımı yapan (OCR) ve bunları sese dönüştüren bir backend mimarisi geliştirdim.

Görüntü işleme kütüphaneleri kullanarak veri transferini ve analiz doğruluğunu optimize ettim.
