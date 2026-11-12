// src/screens/recipe/AIChefScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';
import { MOCK_RECIPES } from '../../data/mockData';

export default function AIChefScreen({ navigation }) {
  const [recipes, setRecipes] = useState(MOCK_RECIPES);

  const handleRefresh = () => {
    Alert.alert('AI Chef', 'Đang cập nhật công thức từ nguyên liệu sẵn có...');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.title}>AI Chef</Text>
            <Text style={styles.subtitle}>Gợi ý theo những nguyên liệu đang có</Text>
          </View>
        </View>

        {/* Priority card */}
        <View style={styles.priorityCard}>
          <Text style={styles.priorityTitle}>Hôm nay nấu gì?</Text>
          <Text style={styles.prioritySub}>AI ưu tiên nguyên liệu sắp hết hạn:</Text>
          <View style={styles.tagRow}>
            <View style={styles.tag}><Text style={styles.tagText}>Cà chua</Text></View>
            <View style={styles.tag}><Text style={styles.tagText}>Thịt gà</Text></View>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Gợi ý dành cho bạn</Text>
          <TouchableOpacity onPress={handleRefresh}>
            <Text style={styles.refreshText}>Làm mới</Text>
          </TouchableOpacity>
        </View>

        {/* Recipe Cards */}
        {recipes.map(item => (
          <TouchableOpacity
            key={item.id}
            style={styles.recipeCard}
            onPress={() => navigation.navigate('RecipeDetail', { recipe: item })}
          >
            <View style={styles.recipeAvatar}>
              <Text style={styles.recipeAvatarText}>{item.code}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recipeTitle}>{item.title}</Text>
              <Text style={styles.recipeInfo}>{item.time} • {item.level}</Text>
              <Text style={styles.recipeLink}>Xem công thức →</Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.moreBtn} onPress={handleRefresh}>
          <Text style={styles.moreBtnText}>+ Gợi ý món mới</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { padding: 4 },
  title: { fontSize: SIZES.h1, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: SIZES.body, color: COLORS.muted, marginTop: 2 },
  priorityCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: SIZES.radiusLarge,
    padding: 18,
    marginBottom: 20,
  },
  priorityTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  prioritySub: { fontSize: 13, color: COLORS.muted, marginVertical: 6 },
  tagRow: { flexDirection: 'row', gap: 8 },
  tag: { backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
  tagText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  refreshText: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: SIZES.radius,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  recipeAvatar: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#FFF9E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  recipeAvatarText: { fontSize: 14, fontWeight: '800', color: '#D97706' },
  recipeTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  recipeInfo: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  recipeLink: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  moreBtn: {
    height: SIZES.btnHeight,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  moreBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
});
