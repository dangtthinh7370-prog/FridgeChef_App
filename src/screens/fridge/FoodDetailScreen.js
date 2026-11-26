import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, DataState, Empty, PageHeader, ui } from '../../components/AppUI';
import FreshnessBadge from '../../components/FreshnessBadge';
import { COLORS } from '../../constants/theme';
import { FOOD_CATEGORIES } from '../../models/food';
import { useFridgeViewModel } from '../../viewmodels/FridgeProvider';

export default function FoodDetailScreen({ navigation, route }) {
  const { foods, mutate, busy, offline, ready, error, reload } = useFridgeViewModel();
  const id = route.params?.foodId ?? route.params?.food?.id;
  const food = foods.find((item) => String(item.id) === String(id));
  const category = FOOD_CATEGORIES.find((item) => item.id === food?.category);
  const disabled = busy || offline;
  const goBack = () => navigation.goBack();

  const deleteFood = () =>
    Alert.alert(
      'Xóa thực phẩm?',
      `Xóa “${food.name}” khỏi tủ lạnh. Nếu bạn đã dùng hoặc bỏ đi, hãy ghi nhận để lưu vào nhật ký.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await mutate('deleteFood', food.id);
              goBack();
            } catch (failure) {
              Alert.alert('Không xóa được', failure.message);
            }
          },
        },
      ],
    );

  return (
    <SafeAreaView style={ui.screen}>
      <PageHeader title="Chi tiết thực phẩm" onBack={goBack} />
      <ScrollView contentContainerStyle={ui.content}>
        <DataState ready={ready} error={error} onRetry={() => reload().catch(() => {})} />
        {!food && ready && (
          <Empty
            title="Không tìm thấy thực phẩm"
            detail="Quay lại tủ lạnh để xem danh sách hiện tại."
          />
        )}
        {!!food && (
          <>
            <View style={s.summary}>
              <View style={s.icon}>
                <Ionicons
                  name={category?.icon || 'grid-outline'}
                  size={27}
                  color={COLORS.darkGreen}
                />
              </View>
              <View style={s.flex}>
                <Text style={s.name}>{food.name}</Text>
                <FreshnessBadge status={food.status} text={food.daysLeft} />
              </View>
            </View>
            <View style={ui.card}>
              {[
                ['cube-outline', 'Số lượng', food.quantityText],
                ['file-tray-outline', 'Ngăn lưu trữ', food.area],
                ['time-outline', 'Hạn sử dụng', food.expDate],
                ['calendar-outline', 'Ngày mua', food.buyDate],
                ['pricetag-outline', 'Nhóm thực phẩm', food.category !== 'other' && category?.name],
              ]
                .filter(([, , value]) => value)
                .map(([icon, label, value]) => (
                  <View key={label} style={s.info}>
                    <Ionicons name={icon} size={18} color={COLORS.primary} />
                    <Text style={[ui.muted, s.flex]}>{label}</Text>
                    <Text style={s.value}>{value}</Text>
                  </View>
                ))}
              {!!food.notes && (
                <View style={s.notes}>
                  <Text style={ui.muted}>Ghi chú</Text>
                  <Text style={ui.body}>{food.notes}</Text>
                </View>
              )}
            </View>
            <View>
              <Button
                title={food.status === 'expired' ? 'Ghi nhận bỏ đi' : 'Ghi nhận đã dùng hoặc bỏ đi'}
                disabled={disabled}
                onPress={() =>
                  navigation.navigate('UseFood', {
                    foodId: food.id,
                    reason: food.status === 'expired' ? 'discarded' : 'used',
                  })
                }
              />
              <Button
                secondary
                title="Chỉnh sửa"
                disabled={disabled}
                onPress={() => navigation.navigate('AddFood', { foodId: food.id })}
              />
              <Pressable
                accessibilityRole="button"
                style={s.delete}
                disabled={disabled}
                onPress={deleteFood}
              >
                <Ionicons name="trash-outline" size={17} color="#9F3B32" />
                <Text style={s.deleteText}>Xóa thực phẩm</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  summary: {
    backgroundColor: '#E7EFDF',
    borderRadius: 16,
    padding: 13,
    gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 50,
    height: 50,
    backgroundColor: '#F5F9F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  name: { color: COLORS.text, fontWeight: '800', fontSize: 20, marginBottom: 5 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 37 },
  value: { color: COLORS.text, fontWeight: '700', fontSize: 14, flexShrink: 1, textAlign: 'right' },
  notes: { borderTopWidth: 1, borderTopColor: COLORS.divider, gap: 3, paddingTop: 9 },
  delete: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deleteText: { color: '#9F3B32', fontSize: 14, fontWeight: '700' },
});
