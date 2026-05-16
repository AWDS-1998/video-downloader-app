# 🚀 دليل بناء Video Downloader - نسخة إنتاجية موقعة

> التطبيق: `com.videodownloader.app`
> Keystore: `015-keystore.zip`
> دالة البناء: `full-build-v2`

---

## 📋 المتطلبات قبل البدء

```bash
# تأكد أن لديك
node --version     # >= 18
java --version     # >= 17 (JDK)
npx expo --version # ~54.x
```

---

## الخطوة 1: توليد ملفات Android الأصلية

```bash
cd /Volumes/thinkplus/Desktop/projects/clickup/downloader-from-youtube/application/mobile

# توليد مجلد android/ بالإعدادات الكاملة (Share Intent Plugin مضمن)
npx expo prebuild --platform android --clean
```

---

## الخطوة 2: فك ضغط الـ Keystore

```bash
# ضع 015-keystore.zip في مجلد mobile/android/
cd android
unzip /path/to/015-keystore.zip -d .
```

---

## الخطوة 3: إعداد متغيرات التوقيع

أضف في ملف `android/gradle.properties`:

```properties
MYAPP_UPLOAD_STORE_FILE=015-keystore.jks
MYAPP_UPLOAD_KEY_ALIAS=<alias_name>
MYAPP_UPLOAD_STORE_PASSWORD=<store_password>
MYAPP_UPLOAD_KEY_PASSWORD=<key_password>
```

> ⚠️ استبدل القيم بالمعلومات الموجودة في ملف الـ Keystore

---

## الخطوة 4: تعديل android/app/build.gradle

```groovy
android {
    ...
    signingConfigs {
        release {
            storeFile file(MYAPP_UPLOAD_STORE_FILE)
            storePassword MYAPP_UPLOAD_STORE_PASSWORD
            keyAlias MYAPP_UPLOAD_KEY_ALIAS
            keyPassword MYAPP_UPLOAD_KEY_PASSWORD
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## الخطوة 5: البناء باستخدام full-build-v2

```bash
cd /Volumes/thinkplus/Desktop/projects/clickup/downloader-from-youtube/application/mobile/android

# بناء AAB موقع للرفع على Google Play
full-build-v2 \
  --app-dir "/Volumes/thinkplus/Desktop/projects/clickup/downloader-from-youtube/application/mobile/android" \
  --keystore "015-keystore.jks" \
  --output-dir "/Volumes/thinkplus/Desktop/projects/clickup/downloader-from-youtube/application/aabs" \
  --build-type release \
  --format aab
```

### أو بناء يدوي مباشر:

```bash
cd /Volumes/thinkplus/Desktop/projects/clickup/downloader-from-youtube/application/mobile/android

# AAB للـ Google Play
./gradlew bundleRelease

# APK للتثبيت المباشر (اختياري)
./gradlew assembleRelease
```

---

## 📁 مكان الملفات الناتجة

| الملف | المسار |
|-------|--------|
| AAB (Google Play) | `android/app/build/outputs/bundle/release/app-release.aab` |
| APK | `android/app/build/outputs/apk/release/app-release.apk` |

```bash
# نسخ AAB لمجلد aabs/
mkdir -p ../../aabs
cp android/app/build/outputs/bundle/release/app-release.aab \
   ../../aabs/video-downloader-v1.0.0.aab
```

---

## الخطوة 6: التحقق من التوقيع

```bash
# التحقق من أن AAB موقع صحيح
jarsigner -verify -verbose -certs \
  android/app/build/outputs/bundle/release/app-release.aab
```

---

## 📤 الرفع على Google Play Console

1. افتح [Google Play Console](https://play.google.com/console)
2. اختر التطبيق أو أنشئ تطبيق جديد
3. اذهب إلى **Production → Create new release**
4. ارفع ملف `video-downloader-v1.0.0.aab`
5. أضف release notes
6. اضغط **Review release**

---

## 🎯 إعدادات Google Play Console

| الإعداد | القيمة |
|---------|--------|
| Package Name | `com.videodownloader.app` |
| Version Code | `1` (زوده كل رفعة) |
| Version Name | `1.0.0` |
| Target SDK | 34 |
| Min SDK | 21 (Android 5.0+) |

---

## ⚡ تحديث versionCode لكل رفعة

في `app.json`:
```json
"android": {
  "versionCode": 2,  // ← زود بـ 1 كل مرة
  "package": "com.videodownloader.app"
}
```

ثم أعد الخطوة 1 → 5.

---

## 🔧 استكشاف الأخطاء

### خطأ: Keystore not found
```bash
# تأكد المسار صحيح
ls android/*.jks
```

### خطأ: SDK not found
```bash
# أضف في local.properties
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
```

### خطأ: Build failed - AAPT
```bash
./gradlew clean && ./gradlew bundleRelease
```
