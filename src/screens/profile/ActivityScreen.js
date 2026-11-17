import React, { useCallback, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Empty, PageHeader, ui } from '../../components/AppUI';
import { useFridgeViewModel } from '../../viewmodels/FridgeProvider';
export default function ActivityScreen({ navigation }) {
  const { getActivity } = useFridgeViewModel();
  const [rows, setRows] = useState([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await getActivity());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getActivity]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  return (
    <SafeAreaView style={ui.screen}>
      <PageHeader
        title="Nhật ký tủ lạnh"
        subtitle="100 hoạt động gần nhất"
        onBack={() => navigation.goBack()}
      />
      {!!error && (
        <View style={ui.content}>
          <Text style={ui.error}>{error}</Text>
          <Button secondary title="Thử lại" onPress={load} />
        </View>
      )}
      <FlatList
        data={rows}
        keyExtractor={(i) => i.id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={ui.content}
        ListEmptyComponent={
          !loading && !error ? (
            <Empty
              title="Chưa có hoạt động"
              detail="Lịch sử sẽ xuất hiện khi bạn ghi nhận dùng thực phẩm, bỏ đi hoặc hoàn thành món ăn."
            />
          ) : null
        }
        renderItem={({ item }) => (
          <View style={ui.card}>
            <Text style={ui.heading}>{item.food_name}</Text>
            <Text style={ui.body}>
              {item.reason === 'discarded'
                ? 'Đã bỏ đi'
                : item.reason === 'cooked'
                  ? 'Đã nấu'
                  : 'Đã sử dụng'}{' '}
              · {item.quantity} {item.unit}
            </Text>
            {!!item.recipe_title && <Text style={ui.muted}>{item.recipe_title}</Text>}
            <Text style={ui.muted}>{new Date(item.created_at).toLocaleString('vi-VN')}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
