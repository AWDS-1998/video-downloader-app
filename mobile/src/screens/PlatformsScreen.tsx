/**
 * PlatformsScreen - المنصات المدعومة
 * المرجع: show_supported_platforms() L1142-1164
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';
import { GradientBackground, PlatformBadge } from '../components';
import api from '../services/api';
import { PLATFORM_MAP } from '../utils/platform';

export const PlatformsScreen: React.FC = () => {
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        const data = await api.getPlatforms();
        setPlatforms(data.platforms || []);
      } catch (err) {
        // Fallback to local map if API fails
        setPlatforms(Object.keys(PLATFORM_MAP).map(id => ({ id, ...PLATFORM_MAP[id] })));
      } finally {
        setLoading(false);
      }
    };
    fetchPlatforms();
  }, []);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.headerTitle}>🌐 المنصات المدعومة</Text>
          <Text style={styles.headerSubtitle}>يدعم التطبيق أكثر من 1800 موقع ومنصة عبر محرك yt-dlp</Text>

          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
          ) : (
            <View style={styles.grid}>
              {platforms.map((p) => (
                <View key={p.id} style={styles.platformCard}>
                  <PlatformBadge platformId={p.id} size="lg" />
                  <Text style={styles.platformDesc}>
                    تحميل {p.id === 'youtube' ? 'فيديو، قائمة تشغيل، شورتس' : 'فيديو وصور'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.footerBox}>
            <Text style={styles.footerText}>
              أي رابط فيديو من منصة غير موجودة في القائمة قد يعمل أيضاً بفضل التحديثات المستمرة لمحرك التحميل.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.base, paddingBottom: 100 },
  headerTitle: { color: Colors.textPrimary, fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.extrabold },
  headerSubtitle: { color: Colors.textSecondary, fontSize: Typography.sizes.sm, marginTop: 4, marginBottom: Spacing.xl },
  grid: { gap: Spacing.md },
  platformCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder, gap: Spacing.sm },
  platformDesc: { color: Colors.textTertiary, fontSize: Typography.sizes.xs, marginLeft: 4 },
  footerBox: { marginTop: Spacing['2xl'], padding: Spacing.lg, backgroundColor: Colors.backgroundTertiary, borderRadius: BorderRadius.md, borderLeftWidth: 4, borderLeftColor: Colors.primary },
  footerText: { color: Colors.textSecondary, fontSize: Typography.sizes.sm, lineHeight: 20 },
});
