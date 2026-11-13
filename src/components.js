import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from './theme';

export function PageHeader({ eyebrow, title, subtitle }) {
  return (
    <View style={styles.header}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function Button({ title, onPress, secondary = false, disabled = false, style }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, secondary && styles.secondaryButton, disabled && styles.disabledButton, style]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function Field({ label, value, onChangeText, placeholder, keyboardType, multiline = false, style }) {
  return (
    <View style={[styles.fieldContainer, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && styles.multilineInput]}
      />
    </View>
  );
}

export function Pill({ label, selected, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.pill, selected && styles.selectedPill]}>
      <Text style={[styles.pillText, selected && styles.selectedPillText]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 24 },
  eyebrow: { color: colors.accent, fontSize: 11, letterSpacing: 1.5, fontWeight: '700', marginBottom: 8 },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 7, lineHeight: 20 },
  card: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 17, marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 12 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  sectionAction: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  button: { minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, backgroundColor: colors.accent },
  buttonText: { color: colors.background, fontSize: 14, fontWeight: '800' },
  secondaryButton: { backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.border },
  secondaryButtonText: { color: colors.accent },
  disabledButton: { opacity: 0.45 },
  fieldContainer: { marginBottom: 13 },
  fieldLabel: { color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 7 },
  input: { minHeight: 48, color: colors.text, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 13, fontSize: 15 },
  multilineInput: { minHeight: 82, textAlignVertical: 'top', paddingTop: 12 },
  pill: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginRight: 7, marginBottom: 7 },
  selectedPill: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  pillText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  selectedPillText: { color: colors.accent },
});
