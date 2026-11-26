import React, { useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Alert, Linking, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { Button, DataState, PageHeader, ui } from '../../components/AppUI';
import { COLORS } from '../../constants/theme';
import { useFridgeViewModel } from '../../viewmodels/FridgeProvider';
import { planShopping, planRecipe, validateRecipe } from '../../models/recipes';

export default function RecipeDetailScreen({ navigation, route }) {
  const {
    foods,
    shopping,
    mutate,
    busy,
    offline,
    ready = true,
    error: fridgeError,
    reload,
  } = useFridgeViewModel();
  const recipe = useMemo(() => {
    try {
      return validateRecipe(route.params?.recipe);
    } catch {
      return null;
    }
  }, [route.params?.recipe]);
  const servings = route.params?.servings || recipe?.servings || 2;
  const plan = useMemo(
    () => recipe && planRecipe(recipe, foods, servings),
    [recipe, foods, servings],
  );
  const [error, setError] = useState('');
  const [failedImage, setFailedImage] = useState(null);
  const [added, setAdded] = useState(false);
  const operation = useRef(Crypto.randomUUID());
  const missing = useMemo(
    () => (plan ? planShopping(plan.ingredients, shopping) : []),
    [plan, shopping],
  );
  if (!recipe)
    return (
      <SafeAreaView style={ui.screen}>
        <PageHeader title="Không tìm thấy công thức" onBack={() => navigation.goBack()} />
      </SafeAreaView>
    );
  const addMissing = async () => {
    setError('');
    try {
      await mutate('addRecipeShopping', { entries: missing, operationId: operation.current });
      setAdded(true);
      Alert.alert('Đã thêm vào đi chợ', 'Đã trừ phần nguyên liệu đang có trong danh sách mua.', [
        { text: 'Đóng' },
        { text: 'Đi chợ', onPress: () => navigation.navigate('MainTabs', { screen: 'Đi chợ' }) },
      ]);
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <SafeAreaView style={ui.screen}>
      <PageHeader
        title={recipe.title}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hỏi Bếp AI về món này"
            style={ui.iconButton}
            onPress={() => navigation.navigate('AIChat', { recipe })}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={23} color={COLORS.darkGreen} />
          </Pressable>
        }
        subtitle={
          recipe.servings
            ? `${recipe.minutes} phút · ${servings} người`
            : 'Định lượng theo nguồn · Chưa ghi thời gian/khẩu phần'
        }
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={ui.content}>
        {recipe.image && failedImage !== recipe.image ? (
          <Image
            source={{ uri: recipe.image }}
            onError={() => setFailedImage(recipe.image)}
            style={{ width: '100%', height: 180, borderRadius: 16 }}
          />
        ) : null}
        {recipe.source && (
          <View style={ui.card}>
            <Text style={ui.heading}>Nguồn: {recipe.source.provider}</Text>
            <Text style={ui.muted}>
              {recipe.reason
                ? 'Tiêu đề và hướng dẫn được Gemini dịch từ nguồn gốc. Định lượng giữ theo dữ liệu nguồn.'
                : 'Hướng dẫn gốc từ nguồn; chưa được dịch.'}
            </Text>
            <Button
              secondary
              title="Xem công thức gốc"
              onPress={() =>
                Linking.openURL(recipe.source.url).catch(() =>
                  setError('Không mở được liên kết nguồn.'),
                )
              }
            />
            {recipe.source.originalUrl && (
              <Button
                secondary
                title="Trang tác giả / nguồn tham khảo"
                onPress={() =>
                  Linking.openURL(recipe.source.originalUrl).catch(() =>
                    setError('Không mở được trang nguồn.'),
                  )
                }
              />
            )}
          </View>
        )}
        <Text style={ui.heading}>Nguyên liệu</Text>
        <DataState
          ready={ready}
          error={fridgeError}
          onRetry={reload ? () => reload().catch(() => {}) : undefined}
        />
        {plan.ingredients.map((i, index) => (
          <View style={ui.card} key={index}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={[ui.body, { flex: 1 }]}>{i.name}</Text>
              <Text style={[ui.body, { flexShrink: 1, textAlign: 'right' }]}>
                {i.measure || (i.quantity == null ? 'Chưa ghi lượng' : i.quantity + ' ' + i.unit)}
              </Text>
            </View>
            <Text style={[ui.muted, { color: i.available ? '#2E7D32' : '#A65C15' }]}>
              {!ready
                ? 'Chờ dữ liệu tủ lạnh để đối chiếu.'
                : i.quantity == null
                  ? i.hasStock
                    ? 'Có trong tủ · nguồn chưa ghi lượng cần dùng.'
                    : 'Chưa đối chiếu được lượng cần dùng.'
                  : i.available
                    ? 'Đã đủ trong tủ lạnh'
                    : `Còn thiếu ${i.missing} ${i.unit}`}
            </Text>
            {i.quantity == null && (
              <Button
                secondary
                title="Nhập lượng cần mua"
                disabled={offline || !ready}
                onPress={() =>
                  navigation.navigate('MainTabs', {
                    screen: 'Đi chợ',
                    params: { initialItem: { name: i.name } },
                  })
                }
              />
            )}
          </View>
        ))}
        <Text style={ui.muted}>
          Chỉ đối chiếu tên và đơn vị tương thích; không tự quy đổi quả, bó, hộp sang khối lượng.
          Gia vị cơ bản theo hướng dẫn cần chuẩn bị riêng.
        </Text>
        <Button
          secondary
          title={
            added
              ? 'Đã thêm nguyên liệu thiếu'
              : missing.length
                ? `Thêm ${missing.length} nguyên liệu thiếu vào đi chợ`
                : 'Chưa có lượng thiếu xác định'
          }
          disabled={added || !missing.length || offline || !ready}
          busy={busy}
          onPress={addMissing}
        />
        {!!error && <Text style={ui.error}>{error}</Text>}
        <Text style={ui.heading}>Các bước nấu</Text>
        {recipe.steps.map((s, index) => (
          <View key={index} style={ui.card}>
            <Text style={ui.heading}>
              {s.title === `Bước ${index + 1}` ? s.title : `${index + 1}. ${s.title}`}
            </Text>
            <Text style={ui.body}>{s.desc}</Text>
            {s.seconds > 0 && (
              <Text style={ui.muted}>Hẹn giờ {Math.ceil(s.seconds / 60)} phút</Text>
            )}
          </View>
        ))}
        <Text style={ui.muted}>
          Nếu đã quá hạn hoặc có mùi, màu, kết cấu bất thường, không dùng nguyên liệu. Thời gian nấu
          chỉ mang tính hướng dẫn.
        </Text>
      </ScrollView>
      <View style={ui.footer}>
        <Button
          title="Bắt đầu nấu"
          onPress={() => navigation.navigate('CookingMode', { recipe, servings })}
        />
      </View>
    </SafeAreaView>
  );
}
