import React from 'react';
import {
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DataState, PageHeader, ui } from '../../components/AppUI';
import kitchenHero from '../../assets/kitchen-hero.jpg';
import { COLORS } from '../../constants/theme';
import { compareFoodPriority } from '../../models/food';
import { useFridgeViewModel } from '../../viewmodels/FridgeProvider';
import { useProfile } from '../../viewmodels/ProfileProvider';

export default function HomeScreen({ navigation }) {
  const { foods, shopping, reload, refreshing, ready, error, offline } = useFridgeViewModel();
  const { profile } = useProfile();
  const soon = foods.filter((food) => food.status === 'soon');
  const expired = foods.filter((food) => food.status === 'expired');
  const urgent = [...expired, ...soon].sort(compareFoodPriority).slice(0, 3);
  const pending = shopping.filter((item) => !item.bought).length;
  const refresh = () => reload().catch(() => {});

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={ui.screen}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <PageHeader
          title="Bếp của bạn"
          subtitle={profile?.display_name ? `Chào ${profile.display_name}` : undefined}
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nhật ký sử dụng thực phẩm"
              style={s.headerIcon}
              onPress={() => navigation.navigate('Activity')}
            >
              <Ionicons name="time-outline" size={23} color={COLORS.darkGreen} />
            </Pressable>
          }
        />
        <View style={ui.content}>
          <ImageBackground source={kitchenHero} style={s.hero}>
            <View style={s.heroContent}>
              <Text style={s.heroLabel}>Tủ lạnh hôm nay</Text>
              <Text style={s.heroTitle}>
                {ready ? `${foods.length} thực phẩm` : 'Tủ lạnh của bạn'}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={!ready || offline}
                accessibilityState={{ disabled: !ready || offline }}
                onPress={() => navigation.navigate('AddFood')}
                style={[s.add, (!ready || offline) && s.disabled]}
              >
                <Ionicons name="add" size={19} color={COLORS.darkGreen} />
                <Text style={s.addText}>Thêm thực phẩm</Text>
              </Pressable>
            </View>
          </ImageBackground>

          {(error || !ready) && <DataState ready={ready} error={error} onRetry={refresh} />}

          {ready && (
            <>
              <View style={s.section}>
                <View style={s.headingRow}>
                  <Text style={s.sectionTitle}>Cần chú ý</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Xem tất cả cảnh báo hạn dùng"
                    style={s.link}
                    onPress={() => navigation.navigate('ExpiryAlert')}
                  >
                    <Text style={s.linkText}>Xem tất cả</Text>
                    <Ionicons name="chevron-forward" size={15} color={COLORS.primary} />
                  </Pressable>
                </View>
                <View style={s.stats}>
                  {[
                    {
                      id: 'soon',
                      total: soon.length,
                      label: 'Sắp hết hạn',
                      icon: 'time-outline',
                      bg: '#FFF0D8',
                      color: '#81500B',
                    },
                    {
                      id: 'expired',
                      total: expired.length,
                      label: 'Quá hạn',
                      icon: 'alert-circle-outline',
                      bg: '#FBE8E4',
                      color: '#9F3B32',
                    },
                  ].map(({ id, total, label, icon, bg, color }) => (
                    <Pressable
                      key={id}
                      accessibilityRole="button"
                      accessibilityLabel={`${total} thực phẩm ${label.toLowerCase()}`}
                      onPress={() => navigation.navigate('ExpiryAlert', { status: id })}
                      style={[s.stat, { backgroundColor: bg }]}
                    >
                      <Ionicons name={icon} size={19} color={color} />
                      <Text style={[s.statText, { color }]}>
                        {total} {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {urgent.length ? (
                  <View style={s.panel}>
                    {urgent.map((food, index) => (
                      <Pressable
                        key={food.id}
                        accessibilityRole="button"
                        style={[s.line, index > 0 && s.divider]}
                        onPress={() => navigation.navigate('FoodDetail', { foodId: food.id })}
                      >
                        <Ionicons
                          name={food.status === 'expired' ? 'alert-circle-outline' : 'time-outline'}
                          size={22}
                          color={food.status === 'expired' ? '#9F3B32' : '#81500B'}
                        />
                        <View style={s.flex}>
                          <Text style={s.itemTitle}>{food.name}</Text>
                          <Text style={ui.muted}>
                            {food.quantityText} · {food.daysLeft}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={17} color={COLORS.muted} />
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={[s.panel, s.line]}>
                    <Ionicons
                      name={foods.length ? 'checkmark-circle-outline' : 'leaf-outline'}
                      size={22}
                      color={COLORS.primary}
                    />
                    <Text style={[ui.body, s.flex]}>
                      {foods.length
                        ? 'Chưa có thực phẩm cần xử lý.'
                        : 'Thêm thực phẩm để theo dõi hạn dùng.'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>Việc nhà bếp</Text>
                <KitchenLink
                  icon="sparkles-outline"
                  title="Gợi ý từ tủ lạnh"
                  detail="Chọn món theo nguyên liệu còn hạn"
                  primary
                  onPress={() =>
                    navigation.navigate('AIChat', {
                      initialDraft: 'Gợi ý một món từ tủ lạnh và hướng dẫn mình nấu từng bước.',
                      initialUseInventory: true,
                    })
                  }
                />
                <View style={s.shortcuts}>
                  <KitchenLink
                    icon="barcode-outline"
                    title="Quét mã"
                    onPress={() => navigation.navigate('BarcodeScanner')}
                  />
                  <KitchenLink
                    icon="cart-outline"
                    title="Đi chợ"
                    detail={pending ? `${pending} món cần mua` : undefined}
                    onPress={() => navigation.navigate('Đi chợ')}
                  />
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function KitchenLink({ icon, title, detail, onPress, primary }) {
  return (
    <Pressable
      accessibilityRole="button"
      style={[s.shortcut, primary && s.recipeLink]}
      onPress={onPress}
    >
      <View style={[s.shortcutIcon, primary && s.recipeIcon]}>
        <Ionicons name={icon} size={22} color={primary ? '#FFF0CC' : COLORS.darkGreen} />
      </View>
      <View style={s.flex}>
        <Text style={[s.itemTitle, primary && s.recipeTitle]}>{title}</Text>
        {!!detail && <Text style={[ui.muted, primary && s.recipeDetail]}>{detail}</Text>}
      </View>
      {primary && <Ionicons name="arrow-forward" size={20} color="#FFF0CC" />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  headerIcon: { ...ui.iconButton, borderRadius: 14, backgroundColor: '#E6EEDF' },
  hero: { borderRadius: 21, overflow: 'hidden', backgroundColor: '#173725' },
  heroContent: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: 146,
    padding: 16,
    gap: 5,
    backgroundColor: '#0B211D40',
  },
  heroLabel: { color: '#E0EDD9', fontSize: 13, fontWeight: '600' },
  heroTitle: {
    color: '#FFFDF5',
    fontSize: 26,
    fontWeight: '800',
    textShadowColor: '#11291E',
    textShadowRadius: 5,
    textShadowOffset: { width: 0, height: 1 },
  },
  add: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F3F7E9',
    borderRadius: 12,
  },
  addText: { color: COLORS.darkGreen, fontSize: 14, fontWeight: '800', flexShrink: 1 },
  disabled: { opacity: 0.6 },
  section: { gap: 8, marginTop: 4 },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitle: { color: COLORS.text, fontWeight: '800', fontSize: 19, flexShrink: 1 },
  link: { minHeight: 44, flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 3 },
  linkText: { color: COLORS.primary, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: {
    minHeight: 44,
    flexBasis: 135,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 12,
    padding: 10,
  },
  statText: { fontWeight: '700', fontSize: 14, flex: 1 },
  panel: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  line: {
    minHeight: 54,
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  divider: { borderTopWidth: 1, borderTopColor: COLORS.divider },
  itemTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shortcut: {
    minHeight: 52,
    flexBasis: 140,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 9,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  shortcutIcon: { padding: 7, borderRadius: 10, backgroundColor: '#E6EEDF' },
  recipeLink: { flexBasis: 'auto', backgroundColor: '#193E30', borderColor: '#193E30' },
  recipeIcon: { backgroundColor: '#325746' },
  recipeTitle: { color: '#FFFDF5' },
  recipeDetail: { color: '#DDEDDC' },
});
