import React, { useRef, useState } from 'react';
import { Text, View, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import { Button, PageHeader, ui } from '../../components/AppUI';
import { useFridgeViewModel } from '../../viewmodels/FridgeProvider';
import { validateQuantity } from '../../models/food';

export default function UseFoodScreen({ route, navigation }) {
  const { foods, mutate, busy, offline } = useFridgeViewModel();
  const food = foods.find((f) => f.id === route.params?.foodId);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState(route.params?.reason || 'used');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const operation = useRef(Crypto.randomUUID());
  // Keep the version shown when this form opened; a server conflict must be reviewed.
  const initial = useRef(food);
  const save = async () => {
    try {
      const amount = validateQuantity(quantity);
      if (amount > initial.current.quantity)
        throw new Error('Lượng dùng vượt quá số lượng hiện có.');
      await mutate('consumeFood', {
        entries: [
          {
            foodId: initial.current.id,
            quantity: amount,
            expectedUpdatedAt: initial.current.updatedAt,
          },
        ],
        reason,
        operationId: operation.current,
      });
      setDone(true);
    } catch (err) {
      setError(err.message);
    }
  };
  if (done)
    return (
      <SafeAreaView style={ui.screen}>
        <PageHeader title="Đã cập nhật tủ lạnh" />
        <View style={ui.content}>
          <Text style={ui.body}>Thao tác đã được ghi vào lịch sử.</Text>
          <Button title="Về tủ lạnh" onPress={() => navigation.popToTop()} />
        </View>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={ui.screen}>
      <PageHeader title="Cập nhật lượng còn lại" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
        {!food ? (
          <Text style={ui.error}>Thực phẩm không còn trong tủ. Hãy quay lại danh sách.</Text>
        ) : (
          <>
            <View style={ui.card}>
              <Text style={ui.heading}>{food.name}</Text>
              <Text style={ui.body}>Còn {food.quantityText}</Text>
              <Text style={ui.muted}>{food.daysLeft}</Text>
            </View>
            <View style={ui.row}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Đã sử dụng"
                  secondary={reason !== 'used'}
                  disabled={food.status === 'expired'}
                  onPress={() => {
                    setReason('used');
                    setError('');
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Đã bỏ đi"
                  secondary={reason !== 'discarded'}
                  onPress={() => {
                    setReason('discarded');
                    setError('');
                  }}
                />
              </View>
            </View>
            <Text style={ui.body}>
              Số lượng {reason === 'discarded' ? 'bỏ đi' : 'đã sử dụng'} ({food.unit})
            </Text>
            <TextInput
              accessibilityLabel="Số lượng đã dùng hoặc bỏ đi"
              style={ui.input}
              keyboardType="decimal-pad"
              value={quantity}
              onChangeText={setQuantity}
              placeholder="Nhập số lượng"
            />
            <Button
              secondary
              title={`Toàn bộ · ${food.quantityText}`}
              onPress={() => setQuantity(String(food.quantity))}
            />
            {food.status === 'expired' && (
              <Text style={ui.error}>
                Thực phẩm đã quá hạn. Chỉ ghi nhận bỏ đi, không dùng để nấu.
              </Text>
            )}
            {!!error && (
              <Text accessibilityRole="alert" style={ui.error}>
                {error}
              </Text>
            )}
            <Button
              title="Xác nhận cập nhật"
              busy={busy}
              disabled={offline || (food.status === 'expired' && reason !== 'discarded')}
              onPress={save}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
