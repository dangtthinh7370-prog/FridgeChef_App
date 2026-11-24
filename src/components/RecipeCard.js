import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ui } from './AppUI';

export default function RecipeCard({ recipe, onOpen, favorite, onFavorite, working }) {
  const [failedImage, setFailedImage] = useState(null);
  const { title, area, reason, image, source, ingredients } = recipe;

  return (
    <View style={s.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem công thức ${title}`}
        onPress={onOpen}
      >
        {image && failedImage !== image ? (
          <Image source={{ uri: image }} style={s.image} onError={() => setFailedImage(image)} />
        ) : (
          <View style={[s.image, s.placeholder]}>
            <Ionicons name="restaurant-outline" size={36} color={COLORS.primary} />
          </View>
        )}
        <View style={s.body}>
          <Text style={s.title}>{title}</Text>
          <Text style={ui.muted}>
            {[area, source?.provider, `${ingredients.length} nguyên liệu`]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {!!reason && (
            <Text numberOfLines={3} style={ui.body}>
              {reason}
            </Text>
          )}
        </View>
      </Pressable>
      {!!onFavorite && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={favorite ? `Bỏ yêu thích ${title}` : `Lưu món yêu thích ${title}`}
          accessibilityState={{ selected: favorite, disabled: !!working }}
          disabled={working}
          onPress={onFavorite}
          style={s.heart}
        >
          <Ionicons
            name={favorite ? 'heart' : 'heart-outline'}
            size={23}
            color={COLORS.darkGreen}
          />
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 18,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 151 },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7EFDF' },
  body: { paddingHorizontal: 14, paddingVertical: 11, gap: 4 },
  title: { color: COLORS.text, fontSize: 19, fontWeight: '800' },
  heart: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#FFFFFFF5',
  },
});
