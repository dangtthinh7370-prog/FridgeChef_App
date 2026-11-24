import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, Alert, AppState, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import * as Crypto from 'expo-crypto';
import { Button, PageHeader, ui } from '../../components/AppUI';
import { useFridgeViewModel } from '../../viewmodels/FridgeProvider';
import { planRecipe, validateRecipe, normalizeName } from '../../models/recipes';
import { scheduleTimer, cancelTimer } from '../../services/notifications';

export default function CookingModeScreen({ navigation, route }) {
  useKeepAwake();
  const { foods, mutate, busy, offline } = useFridgeViewModel();
  const recipe = useMemo(() => {
    try {
      return validateRecipe(route.params?.recipe);
    } catch {
      return null;
    }
  }, [route.params?.recipe]);
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(recipe?.steps[0]?.seconds || 0);
  const [running, setRunning] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('');
  const deadline = useRef(null);
  const notification = useRef(null);
  const [review, setReview] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const operation = useRef(Crypto.randomUUID());
  const alarmGeneration = useRef(0);
  const allowExit = useRef(false);
  const transition = useRef(false);
  const step = recipe?.steps[index];
  const stopAlarm = () => {
    alarmGeneration.current++;
    if (notification.current) cancelTimer(notification.current);
    notification.current = null;
  };
  useEffect(
    () => () => {
      stopAlarm();
    },
    [],
  );
  useEffect(() => {
    if (!running) return undefined;
    const tick = () => {
      if (deadline.current == null) return;
      const seconds = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds) {
        setRunning(false);
        deadline.current = null;
        stopAlarm();
        Alert.alert('Hết giờ', 'Kiểm tra độ chín trước khi sang bước tiếp theo.');
      }
    };
    const timer = setInterval(tick, 250);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [running]);
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (allowExit.current || saved || (!running && !review)) return;
        event.preventDefault();
        Alert.alert(
          'Rời chế độ nấu?',
          'Đồng hồ sẽ dừng. Tồn kho chưa thay đổi nếu bạn chưa xác nhận lượng dùng.',
          [
            { text: 'Ở lại', style: 'cancel' },
            {
              text: 'Rời đi',
              onPress: () => {
                allowExit.current = true;
                stopAlarm();
                setRunning(false);
                setReview(null);
                navigation.dispatch(event.data.action);
              },
            },
          ],
        );
      }),
    [navigation, running, review, saved],
  );
  if (!recipe)
    return (
      <SafeAreaView style={ui.screen}>
        <PageHeader title="Công thức không hợp lệ" onBack={() => navigation.goBack()} />
      </SafeAreaView>
    );
  const toggleTimer = async () => {
    if (running) {
      setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
      setRunning(false);
      deadline.current = null;
      stopAlarm();
      return;
    }
    const manual = Number(manualMinutes);
    const seconds =
      remaining || step.seconds || (Number.isInteger(manual) && manual >= 1 ? manual * 60 : 0);
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > 86400) {
      setError('Nhập số phút hẹn giờ từ 1 đến 1440.');
      return;
    }
    setError('');
    deadline.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    setRunning(true);
    const generation = ++alarmGeneration.current;
    try {
      const id = await scheduleTimer(seconds, step.title, deadline.current);
      if (generation === alarmGeneration.current) notification.current = id;
      else if (id) cancelTimer(id);
    } catch {
      /* foreground timer remains available */
    }
  };
  const changeStep = (next) => {
    const change = () => {
      stopAlarm();
      setRunning(false);
      deadline.current = null;
      setIndex(next);
      setRemaining(recipe.steps[next].seconds);
      setManualMinutes('');
    };
    if (running)
      Alert.alert('Chuyển bước?', 'Đồng hồ bước hiện tại sẽ dừng.', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Chuyển bước', onPress: change },
      ]);
    else change();
  };
  const openReview = () => {
    stopAlarm();
    setRunning(false);
    const plan = planRecipe(recipe, foods, route.params?.servings || recipe.servings || 2);
    const entries = plan.entries.map((e) => ({
      ...e,
      selected: true,
      quantity: String(Math.round(e.quantity * 1000000) / 1000000),
    }));
    for (const ingredient of plan.ingredients.filter((i) => i.quantity == null)) {
      for (const food of foods.filter(
        (f) => f.status !== 'expired' && normalizeName(f.name) === normalizeName(ingredient.name),
      )) {
        if (!entries.some((e) => e.foodId === food.id))
          entries.push({
            foodId: food.id,
            name: food.name,
            unit: food.unit,
            expectedUpdatedAt: food.updatedAt,
            selected: false,
            quantity: '',
          });
      }
    }
    setReview(entries);
    setError('');
  };
  const save = async () => {
    if (transition.current || saved) return;
    transition.current = true;
    try {
      const entries = review
        .filter((e) => e.selected)
        .map((e) => ({ ...e, quantity: Number(e.quantity.replace(',', '.')) }));
      if (!entries.length) {
        setSaved(true);
        return;
      }
      await mutate('consumeFood', {
        entries,
        reason: 'cooked',
        recipeTitle: recipe.title,
        operationId: operation.current,
      });
      setSaved(true);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      transition.current = false;
    }
  };
  if (saved)
    return (
      <SafeAreaView style={ui.screen}>
        <PageHeader title="Hoàn thành món ăn" />
        <View style={ui.content}>
          <Text style={ui.heading}>{recipe.title}</Text>
          <Text style={ui.body}>
            {review.some((entry) => entry.selected)
              ? 'Tồn kho đã được cập nhật theo lượng nguyên liệu bạn xác nhận.'
              : 'Bạn đã hoàn thành món ăn. Tủ lạnh giữ nguyên số lượng.'}
          </Text>
          <Button
            title="Về tủ lạnh"
            onPress={() => navigation.navigate('MainTabs', { screen: 'Tủ lạnh' })}
          />
        </View>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={ui.screen}>
      <PageHeader
        title={review ? 'Xác nhận lượng đã dùng' : recipe.title}
        subtitle={
          review
            ? 'Chỉ trừ những thực phẩm bạn chọn'
            : `Bước ${index + 1}/${recipe.steps.length} · Giữ màn hình sáng`
        }
        onBack={() => (review ? setReview(null) : navigation.goBack())}
      />
      <ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
        {review ? (
          <>
            <Text style={ui.body}>
              Điều chỉnh theo lượng thực tế đã nấu. Nguyên liệu mua ngoài hoặc chưa có trong tủ
              không bị trừ.
            </Text>
            {!review.length && (
              <Text style={ui.muted}>Không có nguyên liệu tương ứng trong tủ để cập nhật.</Text>
            )}
            {review.map((e, n) => (
              <View key={e.foodId} style={ui.card}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: e.selected }}
                  onPress={() =>
                    setReview((rows) =>
                      rows.map((r, i) => (i === n ? { ...r, selected: !r.selected } : r)),
                    )
                  }
                >
                  <Text style={ui.heading}>
                    {e.selected ? '☑' : '☐'} {e.name}
                  </Text>
                </Pressable>
                <Text style={ui.muted}>Đơn vị: {e.unit}</Text>
                <TextInput
                  accessibilityLabel={`Lượng ${e.name} đã dùng`}
                  style={ui.input}
                  keyboardType="decimal-pad"
                  value={e.quantity}
                  onChangeText={(quantity) =>
                    setReview((rows) => rows.map((r, i) => (i === n ? { ...r, quantity } : r)))
                  }
                />
              </View>
            ))}
            <Text style={ui.muted}>
              Nếu dữ liệu đã thay đổi, quay lại rồi mở xác nhận lần nữa để lấy lượng tồn mới.
            </Text>
          </>
        ) : (
          <>
            <View style={{ height: 6, backgroundColor: '#DFE8DB', borderRadius: 3 }}>
              <View
                style={{
                  height: 6,
                  width: `${((index + 1) / recipe.steps.length) * 100}%`,
                  backgroundColor: '#2E7D32',
                  borderRadius: 3,
                }}
              />
            </View>
            <View style={ui.card}>
              <Text style={ui.heading}>
                {step.title === 'Bước ' + (index + 1) ? step.title : index + 1 + '. ' + step.title}
              </Text>
              <Text style={ui.body}>{step.desc}</Text>
            </View>
            <View style={ui.card}>
              {!step.seconds && (
                <>
                  <Text style={ui.muted}>
                    Nguồn chưa có đồng hồ cho bước này. Bạn có thể tự đặt thời gian.
                  </Text>
                  <TextInput
                    accessibilityLabel="Số phút hẹn giờ"
                    style={ui.input}
                    value={manualMinutes}
                    onChangeText={(value) => {
                      setManualMinutes(value);
                      setRemaining(0);
                      setError('');
                    }}
                    placeholder="Số phút"
                    keyboardType="number-pad"
                    editable={!running}
                  />
                </>
              )}
              {step.seconds > 0 || manualMinutes || running ? (
                <View style={ui.card}>
                  <Text style={[ui.title, { textAlign: 'center', fontSize: 48 }]}>
                    {String(Math.floor(remaining / 60)).padStart(2, '0')}:
                    {String(remaining % 60).padStart(2, '0')}
                  </Text>
                  <Button
                    secondary
                    title={running ? 'Tạm dừng' : 'Bắt đầu hẹn giờ'}
                    onPress={toggleTimer}
                  />
                </View>
              ) : null}
            </View>
            <Text style={ui.muted}>
              Kiểm tra thực phẩm đã chín; thời gian hẹn giờ không thay thế kiểm tra thực tế.
            </Text>
          </>
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={ui.error}>
            {error}
          </Text>
        )}
      </ScrollView>
      <View style={ui.footer}>
        {review ? (
          <Button
            title="Xác nhận và hoàn thành"
            busy={busy}
            disabled={offline && review.some((e) => e.selected)}
            onPress={save}
          />
        ) : (
          <>
            <Button
              title={
                index === recipe.steps.length - 1
                  ? 'Hoàn thành · Kiểm tra lượng dùng'
                  : 'Bước tiếp theo'
              }
              onPress={() =>
                index === recipe.steps.length - 1 ? openReview() : changeStep(index + 1)
              }
            />
            {index > 0 && (
              <Button secondary title="Bước trước" onPress={() => changeStep(index - 1)} />
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
