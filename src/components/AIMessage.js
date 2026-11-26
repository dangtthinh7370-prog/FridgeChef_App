import React from 'react';
import { View, Text } from 'react-native';

// Render the small Markdown subset used by Gemini without HTML or embedded links.
export default function AIMessage({ text }) {
  // Guard against non-string values (e.g. a plain object returned unexpectedly)
  const safeText =
    typeof text === 'string'
      ? text
      : typeof text === 'object' && text !== null
        ? JSON.stringify(text, null, 2)
        : String(text ?? '');
  return (
    <View style={{ gap: 6 }}>
      {safeText.split('\n').map((line, index) => {
        if (!line.trim()) return <View key={index} style={{ height: 5 }} />;
        const heading = /^#{1,6}\s+/.test(line);
        const content = line.replace(/^#{1,6}\s+/, '').replace(/^\s*[-*]\s+/, '• ');
        return (
          <Text
            selectable
            key={index}
            style={{
              fontSize: heading ? 17 : 16,
              lineHeight: 26,
              color: '#263B2C',
              fontWeight: heading ? '700' : '400',
              marginTop: heading ? 8 : 0,
            }}
          >
            {content.split(/(\*\*[^*]+\*\*)/g).map((part, n) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <Text key={n} style={{ fontWeight: '700' }}>
                  {part.slice(2, -2)}
                </Text>
              ) : (
                part
              ),
            )}
          </Text>
        );
      })}
    </View>
  );
}
