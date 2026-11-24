import React, { useRef, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, ui } from './AppUI';
import { COLORS } from '../constants/theme';

export function readCookingReply(value) {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const encoded = trimmed.startsWith('FC_CHAT_V1:');
    const json = encoded
      ? trimmed.slice('FC_CHAT_V1:'.length)
      : trimmed.replace(/^\x60{3}(?:json)?\s*|\s*\x60{3}$/gi, '');
    if (json.startsWith('{')) {
      try {
        const data = JSON.parse(json);
        if (typeof data?.message === 'string') return data;
      } catch {
        // Render an ordinary string below.
      }
    }
    if (encoded || /^\{\s*"message"\s*:/.test(json))
      return { message: 'Phản hồi này chưa hiển thị được. Bạn có thể hỏi lại Bếp AI.' };
  }
  return { message: String(value || '') };
}

export function CookingProposal({ proposal, onGuide, onOpenRecipe, onWeb }) {
  const [guide, setGuide] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const load = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      setGuide(await onGuide(proposal));
    } catch (failure) {
      setError(failure.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  if (guide) return <CookingGuide guide={guide} onOpenRecipe={onOpenRecipe} initialExpanded />;
  const open = (url) => {
    if (/^https:\/\/[^\s]+$/i.test(url))
      Linking.openURL(url).catch(() => setError('Chưa mở được liên kết nguồn.'));
  };
  return (
    <View style={ui.card}>
      <View style={ui.row}>
        <Ionicons name="restaurant-outline" size={20} color={COLORS.primary} />
        <Text style={[ui.heading, { flex: 1 }]}>{proposal.title}</Text>
      </View>
      {!!proposal.origin && <Text style={ui.muted}>Xuất xứ theo nguồn · {proposal.origin}</Text>}
      {proposal.sources?.map(({ url, title }) => (
        <Button key={url} secondary title={title} onPress={() => open(url)} />
      ))}
      {proposal.suggestions?.map(({ url, title }) => (
        <Button key={url} secondary title={title} onPress={() => open(url)} />
      ))}
      <Button
        title={busy ? 'Đang tạo hướng dẫn…' : 'Hướng dẫn nấu món này'}
        busy={busy}
        onPress={load}
      />
      {!!error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
      {!!error && !!proposal.webQuery && (
        <Button secondary title="Mở tìm kiếm Google" onPress={() => onWeb(proposal.webQuery)} />
      )}
    </View>
  );
}

export default function CookingGuide({ guide, onOpenRecipe, initialExpanded = false }) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const open = (url) => {
    if (/^https:\/\/[^\s]+$/i.test(url))
      Linking.openURL(url).catch(() => setError('Chưa mở được liên kết nguồn.'));
  };
  return (
    <View style={ui.card}>
      <View style={ui.row}>
        <Ionicons name="restaurant-outline" size={20} color={COLORS.primary} />
        <Text style={[ui.heading, { flex: 1 }]}>{guide.title}</Text>
      </View>
      {!!guide.origin && <Text style={ui.muted}>Xuất xứ theo nguồn · {guide.origin}</Text>}
      {!!guide.sources.length && (
        <Text style={ui.muted}>
          {guide.recipeId ? 'Công thức từ danh mục' : 'Công thức tham khảo từ Google Search'}
        </Text>
      )}
      {guide.sources.map((source) => (
        <Button key={source.url} secondary title={source.title} onPress={() => open(source.url)} />
      ))}
      {!!guide.suggestions?.length && <Text style={ui.muted}>Gợi ý tìm kiếm của Google</Text>}
      {guide.suggestions?.map((source) => (
        <Button key={source.url} secondary title={source.title} onPress={() => open(source.url)} />
      ))}
      <Button
        title={expanded ? 'Thu gọn hướng dẫn' : 'Hướng dẫn nấu món này'}
        onPress={() => setExpanded(!expanded)}
      />
      {expanded && (
        <>
          <Text style={ui.heading}>Nguyên liệu</Text>
          {guide.ingredients.map((ingredient, index) => (
            <Text key={index} style={ui.body}>
              • {ingredient}
            </Text>
          ))}
          <Text style={ui.heading}>
            Bước {step + 1}/{guide.steps.length}
          </Text>
          <Text style={ui.body} accessibilityLiveRegion="polite">
            {guide.steps[step]}
          </Text>
          {step > 0 && <Button secondary title="Bước trước" onPress={() => setStep(step - 1)} />}
          {step < guide.steps.length - 1 && (
            <Button secondary title="Bước tiếp theo" onPress={() => setStep(step + 1)} />
          )}
          {!!guide.recipeId && (
            <Button
              secondary
              title="Đối chiếu tủ lạnh và đi chợ"
              onPress={() => {
                setError('');
                onOpenRecipe(guide.recipeId).catch(() =>
                  setError('Chưa mở được công thức. Vui lòng thử lại.'),
                );
              }}
            />
          )}
        </>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
