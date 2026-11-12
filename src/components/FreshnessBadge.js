// src/components/FreshnessBadge.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

export default function FreshnessBadge({ status, text }) {
  // status: 'valid' | 'soon' | 'expired'
  let bg = COLORS.badgeValidBg;
  let color = COLORS.primary;

  if (status === 'soon') {
    bg = COLORS.badgeSoonBg;
    color = COLORS.expirySoon;
  } else if (status === 'expired') {
    bg = COLORS.badgeExpiredBg;
    color = COLORS.expired;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
