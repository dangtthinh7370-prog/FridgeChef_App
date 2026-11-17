import React from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Empty, PageHeader, ui } from '../../components/AppUI';
import { useFridgeViewModel } from '../../viewmodels/FridgeProvider';
import { useProfile } from '../../viewmodels/ProfileProvider';
export default function HomeScreen({ navigation }) {
  const { foods, shopping, reload, refreshing, offline } = useFridgeViewModel();
  const { profile } = useProfile();
  const soon = foods.filter((f) => f.status === 'soon'),
    expired = foods.filter((f) => f.status === 'expired');
  const urgent = [...expired, ...soon].slice(0, 4);
  const refresh = () => reload().catch((err) => Alert.alert('Chưa tải được dữ liệu', err.message));
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={ui.screen}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <PageHeader
          title="Bếp của bạn"
          subtitle={`Chào ${profile?.display_name || 'bạn'}, hôm nay nấu gì?`}
        />
        <View style={ui.content}>
          <View style={[ui.card, { backgroundColor: '#205C31', borderWidth: 0, padding: 22 }]}>
            <Text style={{ color: '#D9EAD5', fontSize: 13 }}>TỦ LẠNH HÔM NAY</Text>
            <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800' }}>
              {foods.length} thực phẩm
            </Text>
            <Text style={{ color: '#D9EAD5', lineHeight: 21 }}>
              Dùng nguyên liệu đúng lúc, bớt một phần lãng phí.
            </Text>
            <Button title="+ Thêm thực phẩm" onPress={() => navigation.navigate('AddFood')} />
          </View>
          {offline && (
            <Text style={ui.error}>Chưa kết nối được Supabase. Kéo xuống để tải lại dữ liệu.</Text>
          )}
          <View style={ui.row}>
            {[
              ['soon', soon.length, 'Sắp hết hạn', '#FFF3DD'],
              ['expired', expired.length, 'Đã quá hạn', '#FCEBE7'],
            ].map(([status, count, label, color]) => (
              <Pressable
                key={status}
                accessibilityRole="button"
                style={[ui.card, { flex: 1, backgroundColor: color }]}
                onPress={() => navigation.navigate('ExpiryAlert', { status })}
              >
                <Text style={ui.title}>{count}</Text>
                <Text style={ui.body}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={ui.heading}>Cần chú ý</Text>
          {!urgent.length ? (
            <Empty
              title={foods.length ? 'Tủ lạnh đang ổn' : 'Bắt đầu từ thực phẩm đầu tiên'}
              detail={
                foods.length
                  ? 'Chưa có món sắp hết hạn hoặc quá hạn.'
                  : 'Thêm những gì bạn có để theo dõi hạn dùng và tìm món phù hợp.'
              }
            />
          ) : (
            urgent.map((food) => (
              <Pressable
                key={food.id}
                accessibilityRole="button"
                style={[ui.card, ui.row]}
                onPress={() => navigation.navigate('FoodDetail', { foodId: food.id })}
              >
                <Ionicons
                  name={food.status === 'expired' ? 'alert-circle-outline' : 'time-outline'}
                  size={27}
                  color={food.status === 'expired' ? '#B33D36' : '#A65C15'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={ui.heading}>{food.name}</Text>
                  <Text style={ui.muted}>
                    {food.quantityText} · {food.daysLeft}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#71816E" />
              </Pressable>
            ))
          )}
          <View style={ui.card}>
            <Text style={ui.heading}>Nấu từ những gì đang có</Text>
            <Text style={ui.body}>
              Xem món phù hợp với tồn kho, bổ sung phần còn thiếu và nấu từng bước.
            </Text>
            <Button title="Trò chuyện với Bếp AI" onPress={() => navigation.navigate('AIChat')} />
            <Button
              secondary
              title="Khám phá món ăn thế giới"
              onPress={() => navigation.navigate('AIChef')}
            />
          </View>
          <View style={ui.row}>
            <View style={{ flex: 1 }}>
              <Button
                secondary
                title="Quét mã sản phẩm"
                onPress={() => navigation.navigate('BarcodeScanner')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                secondary
                title={`Đi chợ · ${shopping.filter((s) => !s.bought).length} cần mua`}
                onPress={() => navigation.navigate('Đi chợ')}
              />
            </View>
          </View>
          <Button
            secondary
            title="Nhật ký sử dụng và bỏ đi"
            onPress={() => navigation.navigate('Activity')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
