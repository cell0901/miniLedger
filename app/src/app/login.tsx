import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Brand, Button, c, ErrorNotice, Field, MoneyIllustration, Screen, s } from '@/components/ledger-ui';
import { session } from '@/lib/session';
import { api } from '@/lib/api';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);

  if (session.token) return <Redirect href="/" />;

  async function sendOtp() {
    // some regex to check if number is valid between 10-15 digits
    const number = phone.replace(/[\s()-]/g, '');
    if (!/^\+?\d{10,15}$/.test(number)) {
      setError('Enter a valid phone number with 10–15 digits.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await api('/auth/send-otp', 'POST', { number });
      if (!result.ok) {
        setError(result.data.message || 'Could not request a code.');
        return;
      }
      setResent(step === 'otp');
      setPhone(number);
      setOtp('');
      setStep('otp');
    } catch (e) {
      // backend error
      setError(e instanceof Error ? e.message : 'Could not request a code.');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the six-digit code.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await api('/auth/verify-otp', 'POST', {
        number: phone,
        otp: Number(otp),
      });
      if (!result.ok) {
        setError(result.data.message || 'Could not verify the code.');
        return;
      }

      // Save login details, then open the home screen.
      session.token = result.data.token;
      session.phone = phone;
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not verify the code.');
    } finally {
      setBusy(false);
    }
  }

  function changeNumber() {
    setStep('phone');
    setOtp('');
    setError('');
    setResent(false);
  }

  return (
    <Screen>
      <View style={s.row}>
        <Brand />
        <View style={styles.personalBadge}><Text style={styles.personalText}>Between friends</Text></View>
      </View>

      {step === 'phone' ? (
        <View style={styles.hero}>
          <Text style={[s.body, styles.heroBody]}>
            Keep track of the money you lend.{'\n'}Keep the friendship out of the maths.
          </Text>
          <MoneyIllustration />
        </View>
      ) : (
        <View style={styles.otpHero}>
          <View style={styles.codeIcon}><Text style={styles.codeIconText}>···</Text></View>
          <Text style={s.title}>A small code.</Text>
          <Text style={s.body}>Your ledger is just six digits away.</Text>
        </View>
      )}

      <View style={s.card}>
        <View style={{ gap: 6 }}>
          <Text style={s.subtitle}>{step === 'phone' ? 'Let’s get you started' : 'Check your code'}</Text>
          <Text style={s.caption}>
            {step === 'phone' ? 'New here or coming back? Start with your number.' : `Signing in with ${phone}`}
          </Text>
        </View>
        {step === 'phone' ? (
          <Field
            label="Phone number" placeholder="e.g. 9876543210" keyboardType="phone-pad"
            textContentType="telephoneNumber" autoComplete="tel" value={phone}
            onChangeText={setPhone} editable={!busy} returnKeyType="done"
            onSubmitEditing={() => void sendOtp()}
          />
        ) : ( // after sendOtp the step is chagned to otp
          <>
            <Field
              label="Six-digit code" placeholder="000000" keyboardType="number-pad"
              textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6}
              value={otp} onChangeText={setOtp} editable={!busy} style={styles.otpInput}
            />
            <View style={styles.demoNote}>
              <Text style={styles.demoLabel}>DEMO LOGIN</Text>
              <Text style={s.caption}>Your code is printed in the backend terminal.</Text>
            </View>
            {resent && <Text accessibilityLiveRegion="polite" style={styles.resent}>New code ready. Check the backend terminal.</Text>}
          </>
        )}
        <ErrorNotice message={error} />
        <Button
          label={step === 'phone' ? 'Continue  ↗' : 'Open my ledger  ↗'} busy={busy}
          onPress={() => void (step === 'phone' ? sendOtp() : verify())}
        />
        {step === 'otp' && (
          <View style={styles.codeActions}>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void sendOtp()} style={styles.textButton}>
              <Text style={styles.textLink}>Get a new code</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={changeNumber} style={styles.textButton}>
              <Text style={styles.textLink}>Change number</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  personalBadge: { backgroundColor: c.white, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, flexShrink: 1 },
  personalText: { color: c.body, fontSize: 10, fontWeight: '600' },
  hero: { gap: 16, paddingTop: 8 },
  heroTitle: { color: c.ink, fontSize: 48, lineHeight: 49, letterSpacing: -1.8, fontWeight: '900' },
  heroBody: { fontSize: 15, lineHeight: 23 },
  otpHero: { gap: 16, paddingTop: 16, paddingBottom: 8 },
  codeIcon: { height: 64, width: 64, backgroundColor: c.forest, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  codeIconText: { color: c.primary, fontSize: 44, lineHeight: 48, fontWeight: '900' },
  otpInput: { fontSize: 28, letterSpacing: 6, fontWeight: '600', textAlign: 'center' },
  demoNote: { backgroundColor: c.canvas, borderRadius: 12, padding: 14, gap: 5 },
  demoLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1, color: c.body },
  resent: { color: c.positiveDeep, fontSize: 13, lineHeight: 20 },
  codeActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, marginTop: -8 },
  textButton: { minHeight: 44, justifyContent: 'center' },
  textLink: { color: c.forest, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  footer: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingBottom: 8 },
  footerIcon: { color: c.forest, fontSize: 16, fontWeight: '600' },
});
