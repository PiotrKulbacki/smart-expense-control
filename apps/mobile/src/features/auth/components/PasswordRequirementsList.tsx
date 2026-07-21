import { View, Text, StyleSheet } from 'react-native';
import { getPasswordRequirements } from '@shared/features/auth/schemas';
import { DEFAULT_LOCALE, t } from '@shared/features/i18n';

type PasswordRequirementsListProps = {
  password: string;
  confirmPassword?: string;
  showMatch?: boolean;
};

export function PasswordRequirementsList({
  password,
  confirmPassword = '',
  showMatch = false,
}: PasswordRequirementsListProps) {
  const locale = DEFAULT_LOCALE;
  const requirements = getPasswordRequirements(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const items: { key: string; met: boolean; label: string }[] = [
    {
      key: 'minLength',
      met: requirements.minLength,
      label: t('auth.passwordRequirements.minLength', locale),
    },
    {
      key: 'digit',
      met: requirements.hasDigit,
      label: t('auth.passwordRequirements.digit', locale),
    },
    {
      key: 'special',
      met: requirements.hasSpecial,
      label: t('auth.passwordRequirements.special', locale),
    },
  ];

  if (showMatch) {
    items.push({
      key: 'match',
      met: passwordsMatch,
      label: t('auth.passwordRequirements.match', locale),
    });
  }

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <Text style={styles.title}>{t('auth.passwordRequirements.title', locale)}</Text>
      {items.map((item) => (
        <Text key={item.key} style={[styles.item, item.met ? styles.met : styles.unmet]}>
          {item.met ? '✓' : '○'} {item.label}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    marginTop: -4,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  item: {
    fontSize: 12,
    marginBottom: 2,
  },
  met: {
    color: '#059669',
  },
  unmet: {
    color: '#6b7280',
  },
});
