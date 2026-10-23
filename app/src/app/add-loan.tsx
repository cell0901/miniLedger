import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { Button, c, ErrorNotice, Field, Screen, s } from '@/components/ledger-ui';
import { session } from '@/lib/session';
import { api } from '@/lib/api';
import { dateLabel, money, utcToday } from '@/lib/format';

const shortcuts = [{ days: 0, label: 'Today' }, { days: 7, label: 'In 7 days' }, { days: 30, label: 'In 30 days' }];
function dateIn(days: number) {
  const value = new Date(`${utcToday()}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
function isValidDate(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export default function AddLoanScreen() {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<ImagePicker.ImagePickerAsset | null>(null);

  if (!session.token) return <Redirect href="./login" />;
  const goBack = () => router.canGoBack() ? router.back() : router.replace('/');
  const validDate = isValidDate(date);

  async function pickReceipt() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (result.canceled) return;
      const photo = result.assets[0];
      if (photo.fileSize && photo.fileSize > 5 * 1024 * 1024) {
        setError('Receipt must be 5 MB or smaller.');
        return;
      }
      setReceipt(photo);
      setError('');
    } catch {
      setError('Could not open your photos. Please try again.');
    }
  }

  async function save() { // post /loans
    const value = Number(amount);
    // some checks to see if no emtpy friends name and amount is positive amount and date is real date 
    if (!name.trim()) { setError('Add your friend’s name.'); return; }
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || value <= 0 || value > 9999999999.99) {
      setError('Enter a positive amount with up to two decimal places.');
      return;
    }
    if (!validDate) { setError('Enter a real due date in YYYY-MM-DD format.'); return; }
    setBusy(true);
    setError('');
    try {
      const loan = {
        friendName: name.trim(),
        amount: value,
        dueDate: date,
      };
      // Keep sending JSON when there is no photo. A photo needs FormData.
      let body: object = loan;
      if (receipt) {
        const form = new FormData();
        form.append('friendName', loan.friendName);
        form.append('amount', String(loan.amount));
        form.append('dueDate', loan.dueDate);
        // Expo fetch needs a File containing the photo, not a plain URI object.
        // The picker already supplies a File on web; native uses the local URI.
        const photo = receipt.file || new File(receipt.uri);
        form.append('receipt', photo);
        body = form;
      }
      const result = await api('/loans', 'POST', body, session.token);
      if (result.status === 401) {
        session.token = '';
        session.phone = '';
        router.replace('./login');
        return;
      }
      if (!result.ok) {
        setError(result.data.message || 'Could not save the loan.');
        return;
      }
      // Home reloads its loans and summary whenever it becomes visible again.
      goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the loan.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={s.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" disabled={busy} onPress={goBack} style={s.circle}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Text style={s.label}>Add a loan</Text>
        <View style={styles.step}><Text style={styles.stepText}>01 / 01</Text></View>
      </View>

      <View style={s.card}>
        <View style={styles.sectionTitle}>
          <View style={styles.sectionIcon}><Text style={styles.sectionIconText}>↗</Text></View>
          <Text style={s.subtitle}>The loan details</Text>
        </View>
        <Field
          label="Who did you lend to?" placeholder="Your friend’s name" autoCapitalize="words"
          maxLength={100} value={name} onChangeText={setName} editable={!busy}
        />
        <View style={styles.amountBox}>
          <View style={s.row}><Text style={s.label}>How much?</Text><View style={styles.currency}><Text style={styles.currencyText}>INR · ₹</Text></View></View>
          <Field
            label="Amount lent" placeholder="0.00" keyboardType="decimal-pad"
            value={amount} onChangeText={setAmount} editable={!busy} style={styles.amountInput}
          />
        </View>
        <Field
          label="When is it due?" placeholder="YYYY-MM-DD"
          hint="Enter a date or choose below."
          keyboardType="numbers-and-punctuation" maxLength={10}
          value={date} onChangeText={setDate} editable={!busy}
        />
        <View style={styles.chips}>
          {shortcuts.map(shortcut => {
            const selected = date === dateIn(shortcut.days);
            return (
              <Pressable
                accessibilityRole="button" accessibilityState={{ selected, disabled: busy }}
                disabled={busy} key={shortcut.label} onPress={() => setDate(dateIn(shortcut.days))}
                style={[styles.chip, selected && styles.chipSelected]}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{shortcut.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {validDate && date < utcToday() && (
          <View style={styles.pastDateNotice}><Text style={styles.pastDateText}>This date has passed. The loan will be marked overdue.</Text></View>
        )}
      </View>

      <View style={s.card}>
        <View style={s.row}>
          <Text style={s.label}>Receipt</Text>
          <Text style={s.caption}>Optional · up to 5 MB</Text>
        </View>
        {receipt && <Image source={{ uri: receipt.uri }} style={styles.receiptImage} resizeMode="contain" accessibilityLabel="Selected receipt" />}
        <Button label={receipt ? 'Choose another photo' : '+  Attach a receipt'} secondary disabled={busy} onPress={() => void pickReceipt()} />
        {receipt && <Pressable accessibilityRole="button" disabled={busy} onPress={() => setReceipt(null)} style={styles.cancel}><Text style={styles.cancelText}>Remove photo</Text></Pressable>}
        <Text style={s.caption}>Choose a JPEG, PNG or WebP photo of a bill or payment confirmation.</Text>
      </View>

      <View style={styles.preview}>
        <View style={s.row}>
          <View style={[styles.pendingBadge, validDate && date < utcToday() && { backgroundColor: c.negativeBg }]}>
            <Text style={[styles.pendingText, validDate && date < utcToday() && { color: c.white }]}>
              {validDate && date < utcToday() ? 'Overdue' : 'Pending'}
            </Text>
          </View>
        </View>
        <View style={s.row}>
          <View style={styles.previewPerson}>
            <Text style={styles.previewName}>{name.trim() || 'Your friend'}</Text>
            <Text style={s.caption}>{validDate ? `Due ${dateLabel(date)}` : 'Choose a due date above'}</Text>
          </View>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.previewAmount}>{money(Number(amount) || 0)}</Text>
        </View>
        <Text style={styles.previewNote}>Mark it repaid when the money comes back.</Text>
      </View>

      <ErrorNotice message={error} />
      <Button label="Save this loan  ↗" busy={busy} onPress={() => void save()} />
      <Pressable accessibilityRole="button" disabled={busy} onPress={goBack} style={styles.cancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  receiptImage: { width: '100%', height: 200, borderRadius: 12, backgroundColor: c.canvas },
  back: { fontSize: 25, color: c.ink },
  step: { width: 56, alignItems: 'flex-end' },
  stepText: { fontSize: 10, color: c.body, fontWeight: '600', letterSpacing: 1 },
  intro: { gap: 12, paddingTop: 8 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.canvas, alignItems: 'center', justifyContent: 'center' },
  sectionIconText: { fontSize: 20, color: c.forest },
  amountBox: { borderWidth: 1, borderColor: c.ink, padding: 16, borderRadius: 24, gap: 16 },
  currency: { backgroundColor: c.canvas, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  currencyText: { fontSize: 12, fontWeight: '600', color: c.forest },
  amountInput: { fontSize: 36, fontWeight: '600', letterSpacing: -1, minHeight: 66 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -12 },
  chip: { paddingHorizontal: 14, paddingVertical: 12, minHeight: 44, borderRadius: 24, backgroundColor: c.canvas },
  chipSelected: { backgroundColor: c.forest },
  chipText: { fontSize: 12, fontWeight: '600', color: c.body },
  chipTextSelected: { color: c.white },
  pastDateNotice: { backgroundColor: c.warning, borderRadius: 12, padding: 12 },
  pastDateText: { color: c.warningContent, fontSize: 12, lineHeight: 18 },
  preview: { padding: 24, borderRadius: 24, backgroundColor: c.white, gap: 16 },
  pendingBadge: { backgroundColor: c.warning, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  pendingText: { color: c.warningContent, fontSize: 11, fontWeight: '600' },
  previewPerson: { flex: 1, gap: 6 },
  previewName: { color: c.ink, fontSize: 18, fontWeight: '600' },
  previewAmount: { color: c.forest, fontSize: 28, fontWeight: '900', letterSpacing: -1, maxWidth: '50%' },
  previewNote: { color: c.body, fontSize: 12, lineHeight: 18, borderTopWidth: 1, borderTopColor: c.canvas, paddingTop: 16 },
  cancel: { alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: -12 },
  cancelText: { color: c.body, fontSize: 14, fontWeight: '600' },
});
