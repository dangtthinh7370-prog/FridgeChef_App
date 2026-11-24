import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, DataState, Empty, PageHeader, ui } from '../../components/AppUI';
import RecipeCard from '../../components/RecipeCard';
import AIMessage from '../../components/AIMessage';
import { COLORS } from '../../constants/theme';
import { generateRecipes } from '../../services/recipeService';
import { useFridgeViewModel } from '../../viewmodels/FridgeProvider';
import { useRecipes } from '../../viewmodels/RecipeProvider';

const progress = [
  'Đang gửi yêu cầu gợi ý…',
  'Đang chờ Bếp AI đối chiếu công thức…',
  'Bếp AI vẫn đang xử lý yêu cầu…',
];

export default function FridgeSuggestionsScreen({ navigation, route }) {
  const { foods, ready, offline, error: fridgeError, reload } = useFridgeViewModel();
  const { reload: reloadRecipes, favorites, toggleFavorite, working } = useRecipes();
  const [servings, setServings] = useState(2);
  const [preference, setPreference] = useState(() => route.params?.preference?.slice(0, 200) || '');
  const [run, setRun] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const scroll = useRef(null);
  const [progressIndex, setProgressIndex] = useState(0);
  useEffect(() => {
    if (!busy) return undefined;
    const timer = setInterval(
      () => setProgressIndex((index) => Math.min(index + 1, progress.length - 1)),
      3500,
    );
    return () => clearInterval(timer);
  }, [busy]);
  const usable = foods.filter((food) => food.status !== 'expired').length;

  const suggest = async () => {
    if (running.current || !ready || offline || !usable) return;
    running.current = true;
    setBusy(true);
    setProgressIndex(0);
    setRun(null);
    setError('');
    try {
      const result = await generateRecipes({
        servings,
        preference: preference.trim(),
        includeMessage: true,
      });
      setRun({ ...result, servings });
      reloadRecipes().catch(() => {});
    } catch (failure) {
      setError(failure.message);
    } finally {
      running.current = false;
      setBusy(false);
    }
  };

  const change = (update) => {
    update();
    setRun(null);
    setError('');
  };

  return (
    <SafeAreaView style={ui.screen}>
      <PageHeader title="Gợi ý từ tủ lạnh" onBack={() => navigation.goBack()} />
      <ScrollView
        ref={scroll}
        contentContainerStyle={ui.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={s.summary}>
          <View style={s.badge}>
            <Ionicons name="sparkles-outline" size={24} color="#FFEDBE" />
          </View>
          <View style={s.flex}>
            <Text style={s.summaryTitle}>
              {ready ? `${usable} thực phẩm còn hạn` : 'Nguyên liệu của bạn'}
            </Text>
            <Text style={s.summaryBody}>
              AI dùng tên, số lượng và hạn dùng để chọn công thức phù hợp.
            </Text>
          </View>
        </View>
        <DataState ready={ready} error={fridgeError} onRetry={() => reload().catch(() => {})} />
        {ready && !usable && (
          <View style={ui.card}>
            <Empty
              icon="leaf-outline"
              title="Chưa có thực phẩm còn hạn"
              detail="Thêm nguyên liệu hoặc khám phá công thức có sẵn."
            />
            <Button
              title="Thêm thực phẩm"
              disabled={offline}
              onPress={() => navigation.navigate('AddFood')}
            />
            <Button
              secondary
              title="Hỏi Bếp AI nên mua gì"
              onPress={() =>
                navigation.navigate('AIChat', {
                  initialDraft:
                    'Tủ lạnh của mình chưa có nguyên liệu còn hạn. Nên mua gì để nấu một bữa đơn giản?',
                })
              }
            />
            <Button
              secondary
              title="Khám phá món ăn"
              onPress={() => navigation.navigate('MainTabs', { screen: 'Món ăn' })}
            />
          </View>
        )}
        {ready && usable > 0 && (
          <View style={ui.card}>
            <Text style={ui.heading}>Bạn nấu cho mấy người?</Text>
            <View style={s.stepper}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Giảm số người"
                disabled={busy || servings <= 1}
                style={ui.iconButton}
                onPress={() => change(() => setServings((count) => Math.max(1, count - 1)))}
              >
                <Ionicons
                  name="remove-circle-outline"
                  size={25}
                  color={servings <= 1 ? COLORS.muted : COLORS.primary}
                />
              </Pressable>
              <Text accessibilityLiveRegion="polite" style={s.servings}>
                {servings} người
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tăng số người"
                disabled={busy || servings >= 20}
                style={ui.iconButton}
                onPress={() => change(() => setServings((count) => Math.min(20, count + 1)))}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={25}
                  color={servings >= 20 ? COLORS.muted : COLORS.primary}
                />
              </Pressable>
            </View>
            <Text style={ui.heading}>Bạn muốn ăn gì?</Text>
            <TextInput
              accessibilityLabel="Sở thích, không bắt buộc"
              value={preference}
              editable={!busy}
              placeholder="Ví dụ: không cay, ít dầu…"
              placeholderTextColor={COLORS.muted}
              maxLength={200}
              style={ui.input}
              onChangeText={(value) => change(() => setPreference(value))}
            />
            {!!error && (
              <Text accessibilityRole="alert" style={ui.error}>
                {error}
              </Text>
            )}
            <Button
              title={error ? 'Thử gợi ý lại' : 'Gợi ý món'}
              busy={busy}
              disabled={offline}
              onPress={suggest}
            />
          </View>
        )}
        {busy && (
          <View
            style={[ui.card, ui.row]}
            accessibilityLiveRegion="polite"
            onLayout={() => scroll.current?.scrollToEnd({ animated: true })}
          >
            <ActivityIndicator color={COLORS.primary} />
            <Text style={[ui.body, s.flex]}>{progress[progressIndex]}</Text>
          </View>
        )}
        {!!run && (
          <>
            <View
              style={ui.card}
              accessibilityLiveRegion="polite"
              onLayout={(event) =>
                scroll.current?.scrollTo({ y: event.nativeEvent.layout.y, animated: true })
              }
            >
              <View style={ui.row}>
                <Ionicons name="sparkles-outline" size={19} color={COLORS.primary} />
                <Text style={ui.heading}>Bếp AI</Text>
              </View>
              <AIMessage
                text={
                  run.message ||
                  (run.recipes.length
                    ? 'Mình đã tìm được vài món để bạn cân nhắc.'
                    : 'Mình chưa tìm được món phù hợp. Bạn có thể đổi yêu cầu hoặc trao đổi thêm với mình.')
                }
              />
              <Button
                secondary
                title="Trao đổi thêm với Bếp AI"
                onPress={() =>
                  navigation.navigate('AIChat', {
                    initialDraft: preference.trim()
                      ? 'Mình muốn món ' +
                        preference.trim() +
                        '. Bạn có thể giúp mình chọn nguyên liệu hoặc điều chỉnh yêu cầu không?'
                      : '',
                  })
                }
              />
            </View>
            {run.recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                favorite={favorites.includes(recipe.id)}
                working={working}
                onOpen={() =>
                  navigation.navigate('RecipeDetail', { recipe, servings: run.servings })
                }
                onFavorite={() =>
                  toggleFavorite(recipe.id).catch((failure) =>
                    Alert.alert('Chưa lưu được', failure.message),
                  )
                }
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 16,
    padding: 13,
    backgroundColor: '#193E30',
  },
  badge: { borderRadius: 12, backgroundColor: '#325746', padding: 9 },
  summaryTitle: { color: '#FFFDF5', fontSize: 17, fontWeight: '800' },
  summaryBody: { color: '#DDEDDC', fontSize: 14, lineHeight: 20, marginTop: 3 },
  stepper: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 13,
    backgroundColor: '#E7EFDF',
  },
  servings: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
});
