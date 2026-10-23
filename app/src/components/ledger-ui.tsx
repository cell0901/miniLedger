import { useState, type PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Native interpretation of app/design.md. System heavy replaces proprietary Wise Sans.
export const c = {
  primary: '#9fe870',
  primaryActive: '#cdffad',
  pale: '#e2f6d5',
  ink: '#0e0f0c',
  forest: '#163300',
  body: '#454745',
  muted: '#868685',
  canvas: '#e8ebe6',
  white: '#ffffff',
  positive: '#2ead4b',
  positiveDeep: '#054d28',
  warning: '#ffd11a',
  warningContent: '#4a3b1c',
  negative: '#d03238',
  negativeDeep: '#a72027',
  negativeBg: '#320707',
};

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Brand() {
  return (
    <View style={styles.brandRow} accessibilityLabel="MiniLedger">
      <View style={styles.brandMark}><Text style={styles.brandArrow}>↗</Text></View>
      <Text style={s.brand}>MiniLedger</Text>
    </View>
  );
}

export function Button({ label, onPress, busy = false, secondary = false, disabled = false }: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy || disabled, busy }}
      disabled={busy || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondaryButton,
        pressed && { backgroundColor: secondary ? '#dce0d8' : c.primaryActive },
        (busy || disabled) && { opacity: 0.55 },
      ]}>
      {busy ? <ActivityIndicator color={c.ink} /> : <Text style={s.buttonText}>{label}</Text>}
    </Pressable>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        selectionColor={c.forest}
        {...props}
        onFocus={event => { setFocused(true); props.onFocus?.(event); }}
        onBlur={event => { setFocused(false); props.onBlur?.(event); }}
        style={[s.input, props.style, focused && { borderColor: c.forest, backgroundColor: '#f7fbf4' }]}
      />
      {hint && <Text style={s.caption}>{hint}</Text>}
    </View>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.notice}>
      <Text style={styles.errorTitle}>Let’s try that again</Text>
      <Text style={styles.errorBody}>{message}</Text>
    </View>
  );
}

export function MoneyIllustration() {
  return (
    <View style={styles.illustration} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.orbit} />
      <View style={styles.coinBack}><Text style={styles.coinSymbol}>₹</Text></View>
      <View style={styles.coinFront}><Text style={styles.coinArrow}>↗</Text></View>
      <View style={styles.miniTag}><Text style={styles.miniTagText}>A little lent. All accounted for.</Text></View>
    </View>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.canvas },
  page: { flexGrow: 1, padding: 24, gap: 24, width: '100%', maxWidth: 600, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brand: { fontSize: 23, fontWeight: '800', letterSpacing: -1, color: c.forest },
  eyebrow: { fontSize: 11, fontWeight: '600', color: c.body, letterSpacing: 1.3 },
  title: { fontSize: 42, lineHeight: 44, fontWeight: '900', letterSpacing: -1.5, color: c.ink },
  subtitle: { fontSize: 24, lineHeight: 30, fontWeight: '600', letterSpacing: -0.5, color: c.ink },
  body: { fontSize: 16, lineHeight: 24, color: c.body },
  caption: { fontSize: 12, lineHeight: 18, color: c.body },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: c.ink },
  card: { backgroundColor: c.white, padding: 24, borderRadius: 24, gap: 24 },
  field: { gap: 8 },
  input: { backgroundColor: c.white, borderWidth: 1, borderColor: c.ink, paddingHorizontal: 16, paddingVertical: 14, minHeight: 56, fontSize: 17, color: c.ink, borderRadius: 12 },
  button: { backgroundColor: c.primary, borderRadius: 24, minHeight: 56, paddingHorizontal: 24, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  secondaryButton: { backgroundColor: c.canvas },
  buttonText: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: c.ink },
  notice: { padding: 16, backgroundColor: c.negativeBg, borderRadius: 16, gap: 6 },
  circle: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.white, justifyContent: 'center', alignItems: 'center' },
});

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  brandArrow: { fontSize: 25, lineHeight: 30, fontWeight: '900', color: c.forest },
  errorTitle: { fontSize: 14, fontWeight: '600', color: c.white },
  errorBody: { fontSize: 14, lineHeight: 21, color: '#f6dfe0' },
  illustration: { height: 184, width: '100%', alignItems: 'center', justifyContent: 'center' },
  orbit: { position: 'absolute', width: 260, height: 120, borderWidth: 1, borderColor: '#b1b9a9', borderRadius: 90, transform: [{ rotate: '-24deg' }] },
  coinBack: { position: 'absolute', width: 122, height: 122, borderRadius: 61, backgroundColor: c.forest, alignItems: 'center', justifyContent: 'center', transform: [{ translateX: -35 }, { translateY: -9 }, { rotate: '-15deg' }] },
  coinSymbol: { color: c.primary, fontSize: 72, fontWeight: '900' },
  coinFront: { width: 116, height: 116, borderRadius: 58, backgroundColor: c.primary, borderWidth: 5, borderColor: c.canvas, alignItems: 'center', justifyContent: 'center', transform: [{ translateX: 48 }, { translateY: 10 }] },
  coinArrow: { fontSize: 66, fontWeight: '900', color: c.forest },
  miniTag: { position: 'absolute', bottom: 0, backgroundColor: c.white, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 16, transform: [{ rotate: '-4deg' }] },
  miniTagText: { color: c.forest, fontSize: 11, fontWeight: '600' },
});
