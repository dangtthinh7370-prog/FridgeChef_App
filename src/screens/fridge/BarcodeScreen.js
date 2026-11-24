import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { readBarcodeProduct } from '../../models/barcode';
import { Button, PageHeader, ui } from '../../components/AppUI';

export default function BarcodeScreen({ navigation, route }) {
  const formKey = route?.params?.formKey;
  const useProduct = (product) =>
    formKey
      ? navigation.navigate({ key: formKey, merge: true, params: { scannedProduct: product } })
      : navigation.replace('AddFood', { scannedProduct: product });
  const [permission, requestPermission] = useCameraPermissions();
  const focused = useIsFocused();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [torch, setTorch] = useState(false);
  const scanning = useRef(false);
  const request = useRef(null);
  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
    },
    [],
  );
  const lookup = async (value) => {
    const barcode = String(value).trim();
    if (scanning.current) return;
    if (!/^\d{8,14}$/.test(barcode)) {
      setError('Nhập mã sản phẩm gồm 8–14 chữ số.');
      return;
    }
    scanning.current = true;
    setLoading(true);
    setError('');
    setCode(barcode);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    request.current = controller;
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_vi,product_name_en,brands,quantity,product_quantity,product_quantity_unit,categories_tags,image_front_url`,
        { signal: controller.signal },
      );
      if (response.status === 404)
        throw new Error('Chưa có sản phẩm này. Bạn có thể nhập tên thủ công.');
      if (!response.ok) throw new Error('Không kết nối được cơ sở dữ liệu sản phẩm.');
      const result = await response.json();
      if (request.current !== controller) return;
      const product = result.status === 1 ? readBarcodeProduct(result.product, barcode) : null;
      if (!product) throw new Error('Chưa có sản phẩm này. Bạn có thể nhập tên thủ công.');
      useProduct(product);
    } catch (err) {
      if (request.current === controller)
        setError(
          controller.signal.aborted ? 'Tra cứu quá lâu. Thử lại hoặc nhập thủ công.' : err.message,
        );
    } finally {
      clearTimeout(timer);
      if (request.current === controller) {
        request.current = null;
        setLoading(false);
      }
    }
  };
  const reset = () => {
    request.current?.abort();
    request.current = null;
    scanning.current = false;
    setLoading(false);
    setError('');
  };
  return (
    <SafeAreaView style={ui.screen}>
      <PageHeader
        title="Quét mã sản phẩm"
        subtitle="Tra cứu tên với Open Food Facts"
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
        {permission?.granted && focused ? (
          <View style={{ height: 260, borderRadius: 20, overflow: 'hidden' }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
              }}
              onBarcodeScanned={
                loading || scanning.current ? undefined : ({ data }) => lookup(data)
              }
            />
          </View>
        ) : (
          !permission?.granted && (
            <View style={ui.card}>
              <Text style={ui.body}>
                Cho phép camera để quét mã vạch, hoặc nhập dãy số bên dưới.
              </Text>
              <Button
                secondary
                title={permission?.canAskAgain === false ? 'Mở cài đặt camera' : 'Cho phép camera'}
                onPress={() =>
                  permission?.canAskAgain === false ? Linking.openSettings() : requestPermission()
                }
              />
            </View>
          )
        )}
        {permission?.granted && (
          <Button
            secondary
            title={torch ? 'Tắt đèn' : 'Bật đèn'}
            onPress={() => setTorch((v) => !v)}
          />
        )}
        <TextInput
          accessibilityLabel="Mã vạch sản phẩm"
          style={ui.input}
          keyboardType="number-pad"
          maxLength={14}
          placeholder="Nhập mã vạch nếu không quét được"
          value={code}
          onChangeText={(value) => {
            setCode(value);
            reset();
          }}
        />
        <Button
          title="Tra cứu sản phẩm"
          busy={loading}
          onPress={() => {
            scanning.current = false;
            lookup(code);
          }}
        />
        {!!error && (
          <Text accessibilityRole="alert" style={ui.error}>
            {error}
          </Text>
        )}
        {error && <Button secondary title="Quét mã khác" onPress={reset} />}
        <Text style={ui.muted}>
          Nguồn: Open Food Facts (ODbL). Thông tin cộng đồng có thể chưa đầy đủ. Mã vạch không cho
          biết hạn dùng của lô hàng; bạn cần kiểm tra và nhập hạn trên bao bì.
        </Text>
        <Button
          secondary
          title={formKey ? 'Quay lại nhập thủ công' : 'Thêm thực phẩm thủ công'}
          onPress={() => (formKey ? navigation.goBack() : navigation.replace('AddFood'))}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
