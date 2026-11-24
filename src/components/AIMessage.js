import React from 'react';
import { View, Text } from 'react-native';

// Render the small Markdown subset used by Gemini without HTML or embedded links.
export default function AIMessage({ text }) {
  const lines = String(text || '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .split('\n')
    .filter((line) => !/^\s*\x60{3}[a-z]*\s*$/i.test(line));
  return (
    <View style={{ gap: 6 }}>
      {lines.map((line, index) => {
        if (!line.trim()) return <View key={index} style={{ height: 5 }} />;
        const heading = /^\s*#{1,6}\s+/.test(line);
        const content = line
          .replace(/^\s*#{1,6}\s+/, '')
          .replace(/^\s*[-*+]\s+/, '• ')
          .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, '$1');
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
