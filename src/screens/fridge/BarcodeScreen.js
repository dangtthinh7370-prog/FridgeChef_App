import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { Button, PageHeader, ui } from '../../components/AppUI';

export default function BarcodeScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const focused = useIsFocused();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [product, setProduct] = useState(null);
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
    setProduct(null);
    setCode(barcode);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    request.current = controller;
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_vi,brands,quantity`,
        { signal: controller.signal },
      );
      if (!response.ok) throw new Error('Không kết nối được cơ sở dữ liệu sản phẩm.');
      const result = await response.json();
      if (request.current !== controller) return;
      const name = result.product?.product_name_vi || result.product?.product_name;
      if (result.status !== 1 || !name)
        throw new Error('Chưa có sản phẩm này. Bạn có thể nhập tên thủ công.');
      setProduct({
        name: String(name).slice(0, 100),
        brand: result.product.brands,
        quantity: result.product.quantity,
      });
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
    setProduct(null);
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
        {permission?.granted && focused && !product ? (
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
        {product && (
          <View style={ui.card}>
            <Text style={ui.heading}>{product.name}</Text>
            <Text style={ui.muted}>
              {[product.brand, product.quantity].filter(Boolean).join(' · ')}
            </Text>
            <Button
              title="Dùng tên này để thêm thực phẩm"
              onPress={() => navigation.replace('AddFood', { initialName: product.name })}
            />
          </View>
        )}
        {(product || error) && <Button secondary title="Quét mã khác" onPress={reset} />}
        <Text style={ui.muted}>
          Nguồn: Open Food Facts (ODbL). Thông tin cộng đồng có thể chưa đầy đủ. Mã vạch không cho
          biết hạn dùng của lô hàng; bạn cần kiểm tra và nhập hạn trên bao bì.
        </Text>
        <Button
          secondary
          title="Thêm thực phẩm thủ công"
          onPress={() => navigation.replace('AddFood')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
