// Clinic Easy presence node (Beta) for ESP32 (any ESP32-WROOM-32 / DevKit board).
//
// What it does, every SCAN_EVERY_MS:
//   1. scans Bluetooth Low Energy for SCAN_SECONDS,
//   2. collects each device's MAC address and, for iBeacon tags, "uuid:major:minor",
//   3. posts them with signal strength (RSSI) to https://<your-site>/api/presence.
// The server keeps ONLY the tags an admin has linked to a staff member; everything else
// (patients' phones, neighbours) is thrown away on arrival and never stored.
//
// Setup: Arduino IDE 2 -> Boards Manager -> "esp32 by Espressif" (2.x or 3.x) -> board
// "ESP32 Dev Module" -> fill in the 4 lines below -> Upload. Serial Monitor at 115200 shows logs.

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <BLEDevice.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>
#include <map>

// ------------------------------------------------------------------ fill these in
const char* WIFI_SSID   = "Clinic-WiFi";
const char* WIFI_PASS   = "wifi-password";
const char* CEN_URL     = "https://clinicease-demo.netlify.app/api/presence";
const char* CEN_TOKEN   = "cen_paste_the_token_from_Staff_tracking_page";
// ------------------------------------------------------------------

const char* FW_VERSION       = "cen-node-0.1";
const int   SCAN_SECONDS     = 5;       // one BLE scan window
const unsigned long SCAN_EVERY_MS = 20000; // post every 20 s
const int   MIN_RSSI         = -85;     // weaker than this = probably outside the clinic
const size_t MAX_SIGHTINGS   = 60;      // server accepts at most 60 per post

std::map<String, int> seen;  // id -> strongest RSSI in this round

static String hex2(uint8_t b) {
  const char* h = "0123456789abcdef";
  String s; s += h[b >> 4]; s += h[b & 0x0f]; return s;
}

// Returns "uuid:major:minor" for an Apple iBeacon advert, or "" if it is not one.
template <typename T>
static String ibeaconId(const T& md) {
  if (md.length() < 25) return "";
  if ((uint8_t)md[0] != 0x4c || (uint8_t)md[1] != 0x00 || (uint8_t)md[2] != 0x02 || (uint8_t)md[3] != 0x15) return "";
  String uuid;
  for (int i = 4; i < 20; i++) {
    uuid += hex2((uint8_t)md[i]);
    if (i == 7 || i == 9 || i == 11 || i == 13) uuid += "-";
  }
  uint16_t major = ((uint8_t)md[20] << 8) | (uint8_t)md[21];
  uint16_t minor = ((uint8_t)md[22] << 8) | (uint8_t)md[23];
  return uuid + ":" + String(major) + ":" + String(minor);
}

static void remember(const String& id, int rssi) {
  if (rssi < MIN_RSSI || id.length() == 0) return;
  auto it = seen.find(id);
  if (it == seen.end()) {
    if (seen.size() >= MAX_SIGHTINGS) return;
    seen[id] = rssi;
  } else if (rssi > it->second) {
    it->second = rssi;
  }
}

class Callbacks : public BLEAdvertisedDeviceCallbacks {
  void onResult(BLEAdvertisedDevice dev) override {
    int rssi = dev.getRSSI();
    remember(String(dev.getAddress().toString().c_str()), rssi);
    if (dev.haveManufacturerData()) remember(ibeaconId(dev.getManufacturerData()), rssi);
  }
};

BLEScan* scanner;

static void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("WiFi");
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) { delay(500); Serial.print("."); }
  Serial.println(WiFi.status() == WL_CONNECTED ? " connected" : " FAILED");
}

static String body() {
  String b = "{\"fw\":\"";
  b += FW_VERSION;
  b += "\",\"sightings\":[";
  bool first = true;
  for (auto& kv : seen) {
    if (!first) b += ",";
    first = false;
    b += "{\"id\":\"" + kv.first + "\",\"rssi\":" + String(kv.second) + "}";
  }
  b += "]}";
  return b;
}

static void post() {
  connectWifi();
  if (WiFi.status() != WL_CONNECTED) return;
  WiFiClientSecure tls;
  // BETA: certificate check is off so any ESP32 core works out of the box. Before a real clinic,
  // pin the site's root certificate with tls.setCACert(ROOT_CA) so the token cannot be sniffed.
  tls.setInsecure();
  HTTPClient http;
  http.setTimeout(8000);
  if (!http.begin(tls, CEN_URL)) return;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + CEN_TOKEN);
  int code = http.POST(body());
  Serial.printf("posted %u tags -> HTTP %d %s\n", (unsigned)seen.size(), code, http.getString().c_str());
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.printf("\nClinic Easy presence node %s\n", FW_VERSION);
  connectWifi();
  BLEDevice::init("");
  scanner = BLEDevice::getScan();
  scanner->setAdvertisedDeviceCallbacks(new Callbacks(), true /* report duplicates: keep best RSSI */);
  scanner->setActiveScan(false);  // passive: we only listen, never connect to anyone's device
  scanner->setInterval(100);
  scanner->setWindow(99);
}

void loop() {
  unsigned long started = millis();
  seen.clear();
  scanner->start(SCAN_SECONDS, false);
  scanner->clearResults();
  post();  // also acts as a heartbeat when nobody is around
  unsigned long spent = millis() - started;
  if (spent < SCAN_EVERY_MS) delay(SCAN_EVERY_MS - spent);
}
