// src/screens/recipe/RecipeDetailScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';
import { MOCK_RECIPES } from '../../data/mockData';

export default function RecipeDetailScreen({ navigation, route }) {
  const recipe = route.params?.recipe || MOCK_RECIPES[0];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.title}>Chi tiết công thức</Text>
          <Text style={styles.subtitle}>Món ăn đề xuất bởi AI Chef</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Banner */}
        <View style={styles.bannerBox}>
          <Text style={styles.bannerTitle}>{recipe.title.toUpperCase()}</Text>
          <Text style={styles.bannerSub}>{recipe.time} • {recipe.servings || '2 người'} • {recipe.level}</Text>
        </View>

        {/* Nguyên liệu cần có */}
        <Text style={styles.sectionTitle}>Nguyên liệu cần có</Text>

        {recipe.ingredients?.map((ing, idx) => (
          <View key={idx} style={styles.ingRow}>
            <Text style={styles.ingName}>{ing.name}</Text>
            <Text style={styles.ingQty}>{ing.quantity}</Text>
            <View style={ing.available ? styles.badgeReady : styles.badgeNeed}>
              <Text style={ing.available ? styles.readyText : styles.needText}>
                {ing.available ? 'Có sẵn' : 'Cần mua'}
              </Text>
            </View>
          </View>
        ))}

        {/* Hướng dẫn tóm tắt */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Hướng dẫn tóm tắt</Text>
        {recipe.steps?.map((st, idx) => (
          <Text key={idx} style={styles.stepText}>
            {st.step}. {st.title} {st.timer ? `(${st.timer})` : ''}
          </Text>
        ))}

        {/* Button Nấu */}
        <TouchableOpacity
          style={styles.cookBtn}
          onPress={() => navigation.navigate('CookingMode', { recipe })}
        >
          <Text style={styles.cookBtnText}>Bắt đầu nấu</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, marginBottom: 8 },
  backBtn: { padding: 4 },
  title: { fontSize: SIZES.h1, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: SIZES.body, color: COLORS.muted, marginTop: 2 },
  bannerBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: SIZES.radiusLarge,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  bannerTitle: { fontSize: 22, fontWeight: '800', color: '#B45309', textAlign: 'center' },
  bannerSub: { fontSize: 13, color: '#D97706', marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: SIZES.radius,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  ingName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  ingQty: { fontSize: 14, color: COLORS.muted, marginRight: 12 },
  badgeReady: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  readyText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  badgeNeed: { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  needText: { fontSize: 12, color: COLORS.expirySoon, fontWeight: '600' },
  stepText: { fontSize: 14, color: COLORS.text, lineHeight: 22, marginBottom: 6 },
  cookBtn: {
    height: SIZES.btnHeight,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  cookBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
