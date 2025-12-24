#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Ses Kütüphaneleri
#include "AudioFileSourceHTTPStream.h"
#include "AudioFileSourceBuffer.h"
#include "AudioGeneratorMP3.h"
#include "AudioOutputI2S.h"

// ------------ AYARLAR (GitHub'a yüklemeden önce temizlendi) ------------
const char* WIFI_SSID = "WIFI_ADINIZ";        
const char* WIFI_PASS = "WIFI_SIFRENIZ";      
const char* SERVER_URL = "http://SUNUCU_IP_ADRESINIZ:3000/ocr"; 

// DONANIM PIN AYARLARI (AI-THINKER MODELİ)
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// SES VE BUTON PINLERI
#define I2S_DOUT      2  
#define I2S_BCLK      14 
#define I2S_LRC       15 
#define BUTTON_PIN    13 

// Nesnelerin global tanımları
AudioGeneratorMP3 *mp3 = nullptr;
AudioFileSourceHTTPStream *file = nullptr;
AudioOutputI2S *out = nullptr;
AudioFileSourceBuffer *buff = nullptr;

camera_config_t config;

// --- KAMERA FONKSİYONLARI ---

void initCamera() {
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;
    config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;
    config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;
    config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;
    config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM;
    config.pin_pclk = PCLK_PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM;
    config.pin_href = HREF_GPIO_NUM;
    config.pin_sscb_sda = SIOD_GPIO_NUM;
    config.pin_sscb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;

    // Gemini AI analizi için UXGA (1600x1200) çözünürlük
    config.frame_size = FRAMESIZE_UXGA; 
    config.jpeg_quality = 10; // Kalite dengesi optimize edildi
    config.fb_count = 1;

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("Kamera Başlatılamadı: 0x%x\n", err);
        return;
    }
    
    sensor_t * s = esp_camera_sensor_get();
    if (s != NULL) {
        s->set_wb_mode(s, 3); // Yeşilliği önlemek için mod 3
        Serial.println("Kamera sensör ayarları optimize edildi.");
    }
}

void closeCamera() {
    esp_camera_deinit();
    delay(500);
    Serial.println("Kamera KAPATILDI.");
}

// --- SES ÇALMA FONKSİYONU ---

void playMP3FromUrl(const char* url) {
    if (url == nullptr) return;
    
    file = new AudioFileSourceHTTPStream(url);
    buff = new AudioFileSourceBuffer(file, 8192); // Kesintisiz ses için 8KB buffer
    
    out = new AudioOutputI2S();
    out->SetPinout(I2S_BCLK, I2S_LRC, I2S_DOUT);
    out->SetGain(3.5);            
    out->SetOutputModeMono(true); 

    mp3 = new AudioGeneratorMP3();
    mp3->begin(buff, out);
    
    delay(1000); 

    while (mp3->isRunning()) {
        if (!mp3->loop()) mp3->stop();
    }
    
    if (out) {
        out->SetGain(0.0);
        delay(100);
        out->stop();
    }

    if (mp3) { delete mp3; mp3 = nullptr; }
    if (buff) { delete buff; buff = nullptr; }
    if (out) { delete out; out = nullptr; }
    if (file) { delete file; file = nullptr; }
}

void setup() {
    Serial.begin(115200);
    pinMode(4, OUTPUT); // Flash LED
    digitalWrite(4, LOW); 
    pinMode(BUTTON_PIN, INPUT_PULLUP);

    WiFi.begin(WIFI_SSID, WIFI_PASS);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWi-Fi Bağlandı!");

    initCamera();
    delay(500);
    closeCamera();
}

void loop() {
    if (digitalRead(BUTTON_PIN) == LOW) {
        Serial.println("\n>>> BUTONA BASILDI <<<");
        delay(200); 

        initCamera();

        // Fotoğraf çekimi ve Flash kullanımı
        digitalWrite(4, HIGH); 
        delay(500); 
        camera_fb_t * fb = esp_camera_fb_get();
        digitalWrite(4,