import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { Button, PageHeader, ui } from '../../components/AppUI';
import { supabase } from '../../services/supabase';
import { generateRecipes } from '../../services/recipeService';
import { useAuth } from '../../viewmodels/AuthProvider';
import { useRecipes } from '../../viewmodels/RecipeProvider';
import AIMessage from '../../components/AIMessage';

const starters = [
  'Tối nay ăn gì đơn giản?',
  'Giải thích cách làm pasta cho người mới',
  'Gợi ý món Nhật không cay',
];
export default function AIChatScreen({ navigation, route }) {
  const { user } = useAuth();
  const { reload } = useRecipes();
  const [messages, setMessages] = useState([]),
    [draft, setDraft] = useState('');
  const [useInventory, setUseInventory] = useState(false),
    [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [servings, setServings] = useState(2),
    [suggestions, setSuggestions] = useState([]);
  const [pending, setPending] = useState(null);
  const scroll = useRef(),
    lock = useRef(false),
    alive = useRef(true);
  const recipe = route?.params?.recipe;
  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await supabase
        .from('ai_conversations')
        .select('id,message,reply,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (result.error) throw result.error;
      if (alive.current) setMessages(result.data.reverse());
    } catch (e) {
      if (alive.current) setError(e.message);
    } finally {
      if (alive.current) setLoading(false);
    }
  };
  useEffect(() => {
    alive.current = true;
    loadHistory();
    return () => {
      alive.current = false;
    };
  }, [user.id]);
  const send = async (retry) => {
    if (lock.current || loading) return;
    const request = retry || {
      id: Crypto.randomUUID(),
      message: draft.trim(),
      useInventory,
      recipeId: recipe?.id,
    };
    if (!request.message) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setPending(request);
    try {
      const answer = await generateRecipes({
        action: 'chat',
        message: request.message,
        requestId: request.id,
        useInventory: request.useInventory,
        recipeId: request.recipeId,
      });
      if (!alive.current) return;
      setMessages((rows) => [
        ...rows.filter((r) => r.id !== request.id),
        { id: request.id, message: request.message, reply: answer },
      ]);
      setDraft('');
      setPending(null);
    } catch (e) {
      if (alive.current) setError(e.message);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const recommend = async () => {
    if (lock.current || loading) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const found = await generateRecipes({ servings, preference: draft.trim() });
      if (alive.current) {
        setSuggestions(found);
        if (!found.length) setError('Chưa có món phù hợp. Hãy khám phá thêm món hoặc đổi yêu cầu.');
      }
      await reload();
    } catch (e) {
      if (alive.current) setError(e.message);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const clear = () =>
    Alert.alert(
      'Xóa hội thoại?',
      'Xóa các tin nhắn đã lưu của bạn trên Supabase. Công thức yêu thích vẫn được giữ.',
      [
        { text: 'Giữ lại', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            if (lock.current) return;
            lock.current = true;
            setBusy(true);
            try {
              const r = await supabase.from('ai_conversations').delete().eq('user_id', user.id);
              if (r.error) throw r.error;
              setMessages([]);
              setPending(null);
              setSuggestions([]);
              setError('');
            } catch (e) {
              setError(e.message);
            } finally {
              lock.current = false;
              setBusy(false);
            }
          },
        },
      ],
    );
  return (
    <SafeAreaView style={[ui.screen, { backgroundColor: '#F6F5F0' }]}>
      <PageHeader
        title="Bếp AI"
        subtitle="Cùng nghĩ món, cùng học nấu"
        onBack={() => navigation.goBack()}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xóa hội thoại"
            disabled={busy || loading}
            onPress={clear}
            style={ui.iconButton}
          >
            <Ionicons name="trash-outline" size={22} color="#61705F" />
          </Pressable>
        }
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}
        >
          <View style={s.intro}>
            <View style={s.badge}>
              <Ionicons name="sparkles" size={29} color="#EEC784" />
            </View>
            <Text style={s.title}>Một người bạn trong bếp</Text>
            <Text style={s.subtitle}>
              Bạn muốn thử món mới hay cần giúp ở một bước nấu? Cứ hỏi mình nhé.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('AIChef')}
              style={s.discover}
            >
              <Text style={{ color: '#D6E6C9', fontWeight: '700' }}>
                Khám phá công thức thế giới →
              </Text>
            </Pressable>
          </View>
          {!!recipe && (
            <View style={ui.card}>
              <Text style={ui.muted}>Đang trao đổi về công thức</Text>
              <Text style={ui.heading}>{recipe.title}</Text>
              <Button
                secondary
                title="Xem lại từng bước"
                onPress={() => navigation.navigate('RecipeDetail', { recipe })}
              />
            </View>
          )}
          {loading && <ActivityIndicator color="#286343" />}
          {!loading &&
            !messages.length &&
            starters.map((text) => (
              <Pressable
                accessibilityRole="button"
                key={text}
                onPress={() => setDraft(text)}
                style={s.starter}
              >
                <Text style={ui.body}>{text}</Text>
                <Ionicons name="arrow-up-outline" size={18} color="#286343" />
              </Pressable>
            ))}
          {messages.map((m, index) => (
            <View
              key={m.id}
              style={{ gap: 12 }}
              onLayout={(event) => {
                if (index === messages.length - 1)
                  scroll.current?.scrollTo({
                    y: Math.max(0, event.nativeEvent.layout.y - 12),
                    animated: true,
                  });
              }}
            >
              <View style={s.userBubble}>
                <Text selectable style={{ color: 'white', fontSize: 16, lineHeight: 24 }}>
                  {m.message}
                </Text>
              </View>
              <View style={s.aiBubble}>
                <Text style={s.aiLabel}>✦ BẾP AI</Text>
                <AIMessage text={m.reply} />
              </View>
            </View>
          ))}
          {!!pending && (
            <View
              style={s.userBubble}
              onLayout={() => scroll.current?.scrollToEnd({ animated: true })}
            >
              <Text style={{ color: 'white', fontSize: 16, lineHeight: 24 }}>
                {pending.message}
              </Text>
            </View>
          )}
          {busy && (
            <View style={ui.row}>
              <ActivityIndicator color="#286343" />
              <Text accessibilityLiveRegion="polite" style={ui.muted}>
                Bếp AI đang suy nghĩ…
              </Text>
            </View>
          )}
          {!!error && (
            <View style={ui.card}>
              <Text accessibilityRole="alert" style={ui.error}>
                {error}
              </Text>
              {pending && !busy && (
                <Button secondary title="Gửi lại tin nhắn" onPress={() => send(pending)} />
              )}
              {!pending && !busy && (
                <Button secondary title="Tải lại hội thoại" onPress={loadHistory} />
              )}
            </View>
          )}
          {suggestions.map((r) => (
            <View key={r.id} style={ui.card}>
              <Text style={ui.heading}>{r.title}</Text>
              <Text style={ui.body}>{r.reason}</Text>
              <Button
                title="Xem công thức & từng bước"
                onPress={() => navigation.navigate('RecipeDetail', { recipe: r, servings })}
              />
            </View>
          ))}
        </ScrollView>
        <View style={s.composer}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.contextTitle}>Dùng nguyên liệu trong tủ lạnh</Text>
              <Text style={ui.muted}>
                {useInventory ? 'AI nhận tên, lượng và hạn dùng' : 'Không gửi dữ liệu tồn kho mới'}
              </Text>
            </View>
            <Switch
              accessibilityLabel="Cho AI dùng dữ liệu tủ lạnh"
              value={useInventory}
              onValueChange={setUseInventory}
              disabled={busy}
              trackColor={{ true: '#286343' }}
            />
          </View>
          <View style={s.inputRow}>
            <TextInput
              accessibilityLabel="Tin nhắn cho Bếp AI"
              placeholder="Hỏi Bếp AI điều gì đó…"
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={2000}
              editable={!busy && !pending}
              style={s.input}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Gửi tin nhắn"
              disabled={busy || loading || !draft.trim() || !!pending}
              onPress={() => send()}
              style={[s.send, (busy || loading || !draft.trim() || pending) && { opacity: 0.4 }]}
            >
              <Ionicons name="arrow-up" size={25} color="white" />
            </Pressable>
          </View>
          {pending && !busy && (
            <Pressable
              accessibilityRole="button"
              style={ui.iconButton}
              onPress={() => {
                setDraft(pending.message);
                setPending(null);
                setError('');
              }}
            >
              <Text style={ui.muted}>Chỉnh sửa câu hỏi</Text>
            </Pressable>
          )}
          {useInventory && (
            <View style={ui.row}>
              <Pressable
                accessibilityLabel="Giảm số người"
                style={ui.iconButton}
                disabled={busy}
                onPress={() => setServings((n) => Math.max(1, n - 1))}
              >
                <Ionicons name="remove-circle-outline" size={24} color="#286343" />
              </Pressable>
              <Text style={ui.body}>{servings} người</Text>
              <Pressable
                accessibilityLabel="Tăng số người"
                style={ui.iconButton}
                disabled={busy}
                onPress={() => setServings((n) => Math.min(20, n + 1))}
              >
                <Ionicons name="add-circle-outline" size={24} color="#286343" />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Button
                  secondary
                  title="Chọn món từ tủ lạnh"
                  disabled={busy || loading || !!pending}
                  onPress={recommend}
                />
              </View>
            </View>
          )}
          <Text style={{ fontSize: 11, color: '#788172', lineHeight: 16 }}>
            10 lượt/giờ. Gemini có thể nhầm. Hội thoại được lưu trên Supabase; hãy đối chiếu công
            thức nguồn.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  intro: { backgroundColor: '#183F31', borderRadius: 26, padding: 22, gap: 10 },
  badge: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: '#2C5747',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: 'white', fontSize: 25, fontWeight: '800' },
  subtitle: { color: '#D2DFD1', fontSize: 15, lineHeight: 23 },
  discover: { paddingVertical: 12, minHeight: 44 },
  starter: {
    backgroundColor: 'white',
    borderRadius: 17,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderColor: '#E0E5D9',
    borderWidth: 1,
  },
  userBubble: {
    backgroundColor: '#286343',
    padding: 16,
    borderRadius: 20,
    borderBottomRightRadius: 5,
    marginLeft: 36,
    alignSelf: 'flex-end',
  },
  aiBubble: {
    backgroundColor: 'white',
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    padding: 18,
    marginRight: 12,
    gap: 8,
  },
  aiLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: '#618166' },
  answer: { fontSize: 16, lineHeight: 26, color: '#263B2C' },
  composer: {
    padding: 12,
    gap: 8,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderColor: '#DEE5D8',
  },
  contextTitle: { fontSize: 13, fontWeight: '700', color: '#344E39' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderRadius: 22,
    backgroundColor: '#F0F3EC',
    padding: 8,
  },
  input: { flex: 1, minHeight: 44, maxHeight: 120, fontSize: 16, padding: 10, color: '#243B2B' },
  send: {
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: '#286343',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
