import { DEFAULT_LOCALE } from '@shared/features/i18n';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart Expense Control</Text>
      <Text style={styles.subtitle}>Default locale: {DEFAULT_LOCALE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    padding: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
});
