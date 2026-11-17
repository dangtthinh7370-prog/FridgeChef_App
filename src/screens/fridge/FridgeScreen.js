import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Empty, PageHeader, ui } from '../../components/AppUI';
import { useFridgeViewModel } from '../../viewmodels/FridgeProvider';
import { STORAGE_AREAS } from '../../models/food';
import { normalizeName } from '../../models/recipes';
export default function FridgeScreen({ navigation }) {
  const { foods, mutate, busy, reload, refreshing } = useFridgeViewModel();
  const [area, setArea] = useState('all'),
    [status, setStatus] = useState('all'),
    [search, setSearch] = useState('');
  const filtered = useMemo(
    () =>
      foods.filter(
        (f) =>
          (area === 'all' || f.storageAreaId === area) &&
          (status === 'all' || f.status === status) &&
          normalizeName(f.name).includes(normalizeName(search)),
      ),
    [foods, area, status, search],
  );
  const filter = () =>
    Alert.alert('Lọc theo hạn dùng', 'Chọn trạng thái', [
      { text: 'Tất cả', onPress: () => setStatus('all') },
      { text: 'Còn hạn', onPress: () => setStatus('valid') },
      { text: 'Sắp hết hạn', onPress: () => setStatus('soon') },
      { text: 'Quá hạn', onPress: () => setStatus('expired') },
      { text: 'Hủy', style: 'cancel' },
    ]);
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={ui.screen}>
      <PageHeader
        title="Tủ lạnh"
        subtitle={`${foods.length} thực phẩm · Xếp theo hạn dùng`}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quét mã sản phẩm"
            style={ui.iconButton}
            onPress={() => navigation.navigate('BarcodeScanner')}
          >
            <Ionicons name="barcode-outline" size={25} color="#2E7D32" />
          </Pressable>
        }
      />
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <TextInput
          accessibilityLabel="Tìm thực phẩm"
          placeholder="Tìm tên thực phẩm, có hoặc không dấu…"
          value={search}
          onChangeText={setSearch}
          style={ui.input}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {[{ id: 'all', name: 'Tất cả' }, ...STORAGE_AREAS].map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: area === item.id }}
              onPress={() => setArea(item.id)}
              style={[
                ui.button,
                {
                  paddingHorizontal: 16,
                  backgroundColor: area === item.id ? '#2E7D32' : '#E7F0E1',
                },
              ]}
            >
              <Text style={[ui.buttonText, area !== item.id && { color: '#2E7D32' }]}>
                {item.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.heading}>{filtered.length} thực phẩm</Text>
          <Pressable accessibilityRole="button" style={ui.iconButton} onPress={filter}>
            <Text style={{ color: '#2E7D32', fontWeight: '600' }}>
              Lọc{status !== 'all' ? ' ●' : ''}
            </Text>
          </Pressable>
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(f) => f.id}
        refreshing={refreshing}
        onRefresh={() => reload().catch((err) => Alert.alert('Chưa tải được', err.message))}
        contentContainerStyle={[ui.content, { paddingTop: 4 }]}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('FoodDetail', { foodId: item.id })}
            style={ui.card}
          >
            <View style={ui.row}>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 13,
                  backgroundColor: '#E7F0E1',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontWeight: '700', color: '#2E7D32' }}>{item.code}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ui.heading}>{item.name}</Text>
                <Text style={ui.muted}>
                  {item.quantityText} · {item.area}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#71816E" />
            </View>
            <Text
              style={{
                color:
                  item.status === 'expired'
                    ? '#B33D36'
                    : item.status === 'soon'
                      ? '#A65C15'
                      : '#2E7D32',
                fontSize: 13,
                fontWeight: '600',
              }}
            >
              {item.daysLeft} · {item.expDate}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <>
            <Empty
              title={foods.length ? 'Không tìm thấy thực phẩm' : 'Tủ lạnh chưa có gì'}
              detail={
                foods.length
                  ? 'Thử đổi từ khóa, khu vực hoặc bộ lọc.'
                  : 'Thêm thực phẩm để theo dõi hạn dùng và lên món ăn.'
              }
            />
          </>
        }
      />
      <View style={ui.footer}>
        <Button title="+ Thêm thực phẩm" onPress={() => navigation.navigate('AddFood')} />
      </View>
    </SafeAreaView>
  );
}
