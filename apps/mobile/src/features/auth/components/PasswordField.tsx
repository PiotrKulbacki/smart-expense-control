import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, type TextInputProps } from 'react-native';
import { DEFAULT_LOCALE, t } from '@shared/features/i18n';

type PasswordFieldProps = Omit<TextInputProps, 'secureTextEntry'> & {
  label: string;
};

export function PasswordField({ label, editable = true, style, ...props }: PasswordFieldProps) {
  const locale = DEFAULT_LOCALE;
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      <TextInput
        style={[styles.input, style]}
        placeholder={label}
        editable={editable}
        secureTextEntry={!visible}
        {...props}
      />
      <Pressable
        onPress={() => setVisible((current) => !current)}
        disabled={!editable}
        style={styles.toggle}
        accessibilityRole="button"
        accessibilityLabel={t(
          visible ? 'auth.labels.hidePassword' : 'auth.labels.showPassword',
          locale
        )}
      >
        <Text style={styles.toggleText}>
          {t(visible ? 'auth.labels.hidePassword' : 'auth.labels.showPassword', locale)}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    paddingRight: 88,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  toggle: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  toggleText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
  },
});
