/**
 * Expo Config Plugin - Share Intent
 * Makes the app appear in the share menu when sharing a video link
 * Handles URL extraction from shared text (YouTube shares "Title\nURL")
 */
const { withAndroidManifest, withMainActivity } = require('@expo/config-plugins');

function withShareIntent(config) {
  // 1) Add intent-filter for ACTION_SEND and ACTION_VIEW in AndroidManifest.xml
  config = withAndroidManifest(config, (cfg) => {
    const mainActivity = cfg.modResults.manifest.application[0].activity[0];
    if (!mainActivity['intent-filter']) {
      mainActivity['intent-filter'] = [];
    }

    // ACTION_SEND (share from other apps)
    mainActivity['intent-filter'].push({
      action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
      category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
      data: [{ $: { 'android:mimeType': 'text/plain' } }],
    });

    // ACTION_VIEW for video URLs (direct deep link)
    mainActivity['intent-filter'].push({
      action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
      category: [
        { $: { 'android:name': 'android.intent.category.DEFAULT' } },
        { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
      ],
      data: [
        { $: { 'android:scheme': 'https', 'android:host': 'youtu.be' } },
        { $: { 'android:scheme': 'https', 'android:host': 'www.youtube.com' } },
        { $: { 'android:scheme': 'https', 'android:host': 'youtube.com' } },
        { $: { 'android:scheme': 'https', 'android:host': 'm.youtube.com' } },
      ],
    });

    return cfg;
  });

  // 2) Modify MainActivity to extract URL from shared text and pass it via Linking
  config = withMainActivity(config, (cfg) => {
    let contents = cfg.modResults.contents;

    // Helper function to extract URL from shared text
    const shareHandlerCode = `
    // Handle share intent - extract URL from shared text
    if (intent?.action == android.content.Intent.ACTION_SEND && intent.type == "text/plain") {
      val sharedText = intent.getStringExtra(android.content.Intent.EXTRA_TEXT)
      if (sharedText != null) {
        // Extract URL from text (YouTube shares: "Title\\nhttps://youtu.be/...")
        val urlPattern = Regex("https?://[^\\\\s]+")
        val match = urlPattern.find(sharedText)
        val url = match?.value ?: sharedText
        intent.data = android.net.Uri.parse(url.trim())
      }
    }`;

    contents = contents.replace(
      'super.onCreate(null)',
      `super.onCreate(null)${shareHandlerCode}`
    );

    // Add onNewIntent for when app is already open
    const onNewIntentCode = `
  override fun onNewIntent(intent: android.content.Intent?) {
    if (intent?.action == android.content.Intent.ACTION_SEND && intent?.type == "text/plain") {
      val sharedText = intent.getStringExtra(android.content.Intent.EXTRA_TEXT)
      if (sharedText != null) {
        val urlPattern = Regex("https?://[^\\\\s]+")
        val match = urlPattern.find(sharedText)
        val url = match?.value ?: sharedText
        intent.data = android.net.Uri.parse(url.trim())
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
