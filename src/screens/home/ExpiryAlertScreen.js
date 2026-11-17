import React, { useState } from 'react';
import { View, Text, ScrollView, Switch, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Empty, PageHeader, ui } from '../../components/AppUI';
import { useFridgeViewModel } from '../../viewmodels/FridgeProvider';

export default function ExpiryAlertScreen({ navigation, route }) {
  const { foods, reminderEnabled, toggleReminder, reminderError } = useFridgeViewModel();
  const [filter, setFilter] = useState(route.params?.status || 'all');
  const [saving, setSaving] = useState(false);
  const urgent = foods.filter(
    (f) => f.status !== 'valid' && (filter === 'all' || f.status === filter),
  );
  const toggle = async (value) => {
    if (saving) return;
    setSaving(true);
    try {
      await toggleReminder(value);
    } catch (err) {
      Alert.alert('Chưa bật được nhắc nhở', err.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <SafeAreaView style={ui.screen}>
      <PageHeader
        title="Theo dõi hạn dùng"
        subtitle="Dùng đúng lúc, giảm lãng phí"
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={ui.content}>
        <View style={ui.row}>
          {[
            ['all', 'Tất cả'],
            ['soon', 'Sắp hết hạn'],
            ['expired', 'Quá hạn'],
          ].map(([id, label]) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === id }}
              style={[
                ui.button,
                { flex: 1, backgroundColor: filter === id ? '#2E7D32' : '#E7F0E1' },
              ]}
              onPress={() => setFilter(id)}
            >
              <Text style={[ui.buttonText, filter !== id && { color: '#2E7D32' }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {!urgent.length && (
          <Empty
            title="Không có thực phẩm cần cảnh báo"
            detail="Hạn dùng được cập nhật theo ngày hiện tại."
          />
        )}
        {urgent.map((food) => (
          <Pressable
            key={food.id}
            accessibilityRole="button"
            onPress={() => navigation.navigate('FoodDetail', { foodId: food.id })}
            style={[
              ui.card,
              {
                borderLeftWidth: 4,
                borderLeftColor: food.status === 'expired' ? '#B33D36' : '#B97913',
              },
            ]}
          >
            <Text style={ui.heading}>{food.name}</Text>
            <Text style={ui.body}>
              {food.quantityText} · {food.area}
            </Text>
            <Text style={{ color: food.status === 'expired' ? '#B33D36' : '#A65C15' }}>
              {food.daysLeft}
            </Text>
            <Text style={ui.muted}>
              {food.status === 'expired' ? 'Kiểm tra và ghi nhận bỏ đi' : 'Chạm để xem chi tiết'}
            </Text>
          </Pressable>
        ))}
        <View style={ui.card}>
          <View style={ui.row}>
            <View style={{ flex: 1 }}>
              <Text style={ui.heading}>Nhắc kiểm tra tủ lạnh</Text>
              <Text style={ui.muted}>
                07:00 hằng ngày và trước hạn dùng một ngày. Cài đặt theo tài khoản; cần cấp quyền
                trên mỗi điện thoại. Hệ điều hành có thể điều chỉnh thời điểm hiển thị.
              </Text>
            </View>
            <Switch value={reminderEnabled} disabled={saving} onValueChange={toggle} />
          </View>
          {!!reminderError && <Text style={ui.error}>{reminderError}</Text>}
        </View>
        <Button
          title="Gợi ý món từ nguyên liệu còn hạn"
          onPress={() => navigation.navigate('AIChef')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
