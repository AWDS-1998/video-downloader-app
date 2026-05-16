/**
 * Expo Config Plugin - Share Intent
 * يجعل التطبيق يظهر في قائمة المشاركة عند مشاركة رابط فيديو
 */
const { withAndroidManifest, withMainActivity } = require('@expo/config-plugins');

function withShareIntent(config) {
  // 1) إضافة intent-filter لـ ACTION_SEND في AndroidManifest.xml
  config = withAndroidManifest(config, (cfg) => {
    const mainActivity = cfg.modResults.manifest.application[0].activity[0];
    if (!mainActivity['intent-filter']) {
      mainActivity['intent-filter'] = [];
    }
    mainActivity['intent-filter'].push({
      action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
      category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
      data: [{ $: { 'android:mimeType': 'text/plain' } }],
    });
    return cfg;
  });

  // 2) تعديل MainActivity لقراءة النص المشارك وتحويله إلى URL يقرأه Linking
  config = withMainActivity(config, (cfg) => {
    let contents = cfg.modResults.contents;

    // إضافة الكود بعد super.onCreate(null)
    const shareHandlerCode = `
    // Handle share intent - convert EXTRA_TEXT to intent data for Linking
    if (intent?.action == android.content.Intent.ACTION_SEND && intent.type == "text/plain") {
      val sharedText = intent.getStringExtra(android.content.Intent.EXTRA_TEXT)
      if (sharedText != null) {
        intent.data = android.net.Uri.parse(sharedText)
      }
    }`;

    contents = contents.replace(
      'super.onCreate(null)',
      `super.onCreate(null)${shareHandlerCode}`
    );

    // إضافة onNewIntent للتعامل مع المشاركة والتطبيق مفتوح
    const onNewIntentCode = `
  override fun onNewIntent(intent: android.content.Intent?) {
    if (intent?.action == android.content.Intent.ACTION_SEND && intent?.type == "text/plain") {
      val sharedText = intent.getStringExtra(android.content.Intent.EXTRA_TEXT)
      if (sharedText != null) {
        intent.data = android.net.Uri.parse(sharedText)
      }
    }
    super.onNewIntent(intent)
  }`;

    const lastBrace = contents.lastIndexOf('}');
    contents = contents.substring(0, lastBrace) + onNewIntentCode + '\n}\n';

    cfg.modResults.contents = contents;
    return cfg;
  });

  return config;
}

module.exports = withShareIntent;
