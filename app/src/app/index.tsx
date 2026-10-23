import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brand, Button, c, ErrorNotice, s } from '@/components/ledger-ui';
import { api } from '@/lib/api';
import { dateLabel, isOverdue, money } from '@/lib/format';
import { session } from '@/lib/session';
import type { Loan, Summary } from '@/lib/types';

type Filter = 'All' | 'Pending' | 'Overdue' | 'Repaid';
const filters: Filter[] = ['All', 'Pending', 'Overdue', 'Repaid'];

export default function HomeScreen() {
  // Data and UI state belong to this screen, just like in a React component.
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalLent: 0, totalRepaid: 0, overdue: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [repaying, setRepaying] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  // Like useEffect, but also runs when we return from the add-loan screen.
  // useCallback keeps the focus listener from restarting on every render.
  useFocusEffect(useCallback(() => {
    void loadLedger();
  }, []));

  function signOut() {
    session.token = '';
    session.phone = '';
    router.replace('./login');
  }

  async function loadLedger() {
    const token = session.token;
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const loanResult = await api('/loans', 'GET', undefined, token);
      // Ignore an old response if the user signed out while it was loading.
      if (session.token !== token) return;
      if (loanResult.status === 401) { signOut(); return; }
      if (!loanResult.ok) {
        setError(loanResult.data.message || 'Could not load your loans.');
        return;
      }

      const summaryResult = await api('/loans/summary', 'GET', undefined, token);
      if (session.token !== token) return;
      if (summaryResult.status === 401) { signOut(); return; }
      if (!summaryResult.ok) {
        setError(summaryResult.data.message || 'Could not load the summary.');
        return;
      }

      const entries: Loan[] = loanResult.data.loans;
      entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setLoans(entries);
      setSummary(summaryResult.data.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your ledger.');
    } finally {
      setLoading(false);
    }
  }

  if (!session.token) return <Redirect href="./login" />;

  const filtered = loans.filter(loan => {
    if (filter === 'All') return true;
    if (filter === 'Overdue') return isOverdue(loan);
    if (filter === 'Repaid') return loan.status === 'REPAID';
    return loan.status === 'PENDING';
  });
  const pending = loans.filter(loan => loan.status === 'PENDING').length;
  const stats = [
    { label: 'Total lent', value: summary.totalLent, icon: '↗', color: c.forest },
    { label: 'Repaid', value: summary.totalRepaid, icon: '↙', color: c.positiveDeep },
    { label: 'Overdue', value: summary.overdue, icon: '!', color: Number(summary.overdue) > 0 ? c.negativeDeep : c.body },
  ];

  async function repay(loan: Loan) {
    setRepaying(loan.id);
    setActionError('');
    try {
      const result = await api(`/loans/${loan.id}/repay`, 'PATCH', undefined, session.token);
      if (result.status === 401) { signOut(); return; }
      if (!result.ok) {
        setActionError(result.data.message || 'Could not mark this loan repaid.');
        return;
      }
      await loadLedger();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not mark this loan repaid.');
    } finally {
      setRepaying(null);
    }
  }

  function confirmRepayment(loan: Loan) {
    Alert.alert('All settled up?', `Confirm you received ${money(loan.amount)} from ${loan.friendName}.`, [
      { text: 'Not yet', style: 'cancel' },
      { text: 'Yes, mark repaid', onPress: () => void repay(loan) },
    ]);
  }

  function confirmSignOut() {
    Alert.alert('Sign out?', 'Your entries will be here when you sign back in.', [
      { text: 'Stay here', style: 'cancel' },
      { text: 'Sign out', onPress: signOut },
    ]);
  }

  return (
    <SafeAreaView style={s.screen}>
      <FlatList
        data={filtered}
        keyExtractor={loan => loan.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadLedger} tintColor={c.forest} colors={[c.forest]} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={s.row}>
              <Brand />
              <Pressable accessibilityRole="button" onPress={confirmSignOut} style={styles.signOut}>
                <Text style={styles.signOutText}>Sign out</Text>
              </Pressable>
            </View>

            <View style={styles.intro}>
              <Text style={styles.heading}>Your money,{'\n'}in good company.</Text>
            </View>

            <View style={styles.balanceCard}>
              <View style={s.row}>
                <Text style={styles.balanceLabel}>Still with friends</Text>
              </View>
              <Text adjustsFontSizeToFit numberOfLines={1} style={styles.balance}>
                {loading && loans.length === 0 ? '—' : money(Number(summary.totalLent) - Number(summary.totalRepaid))}
              </Text>
              <View style={styles.balanceFooter}>
                <View style={styles.statusDot} />
                <Text style={styles.balanceCaption}>
                  {loading && loans.length === 0 ? 'Updating your ledger…' : `${pending} ${pending === 1 ? 'loan' : 'loans'} waiting to come back`}
                </Text>
              </View>
            </View>

            <View style={styles.stats}>
              {stats.map(stat => (
                <View key={stat.label} style={styles.statCard}>
                  <Text style={[styles.statIcon, { color: stat.color }]}>{stat.icon}</Text>
                  <Text style={s.caption}>{stat.label}</Text>
                  <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.statValue, { color: stat.color }]}>
                    {loading && loans.length === 0 ? '—' : money(stat.value)}
                  </Text>
                </View>
              ))}
            </View>
            <Button label="+  Add a loan" onPress={() => router.push('./add-loan')} />
            <ErrorNotice message={actionError || error} />
            {error && <Button label="Try again" onPress={() => void loadLedger()} secondary />}

            <View style={styles.entriesHeading}>
              <Text style={s.subtitle}>Summary</Text>
              <Text style={styles.count}>{loans.length}</Text>
            </View>
            <View style={styles.filters}>
              {filters.map(value => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === value }}
                  key={value}
                  onPress={() => setFilter(value)}
                  style={[styles.filter, filter === value && styles.filterActive]}>
                  <Text style={[styles.filterLabel, filter === value && styles.filterLabelActive]}>{value}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const overdue = isOverdue(item);
          const repaid = item.status === 'REPAID';
          return (
            <View style={[styles.entry, overdue && styles.overdueEntry]}>
              <View style={s.row}>
                <View style={styles.person}>
                  <View style={[styles.avatar, repaid && styles.avatarRepaid]}>
                    <Text style={[styles.initials, repaid && { color: c.positiveDeep }]}>
                      {item.friendName.trim().split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.personInfo}>
                    <Text style={s.label}>{item.friendName}</Text>
                    <Text style={[s.caption, overdue && { color: c.negativeDeep }]}>
                      Due {dateLabel(item.dueDate)}
                    </Text>
                  </View>
                </View>
                <Text adjustsFontSizeToFit numberOfLines={1} style={styles.amount}>{money(item.amount)}</Text>
              </View>
              <View style={styles.entryBottom}>
                <View style={[styles.badge, repaid && styles.repaidBadge, overdue && styles.overdueBadge]}>
                  <Text style={[styles.badgeText, repaid && styles.repaidText, overdue && styles.overdueText]}>
                    {repaid ? '✓  Repaid' : overdue ? '!  Overdue' : '◷  Pending'}
                  </Text>
                </View>
                {!repaid ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Mark loan to ${item.friendName} repaid`}
                    accessibilityState={{ disabled: repaying !== null, busy: repaying === item.id }}
                    disabled={repaying !== null}
                    onPress={() => confirmRepayment(item)}
                    style={({ pressed }) => [styles.repay, pressed && { opacity: 0.6 }, repaying !== null && { opacity: 0.5 }]}>
                    <Text style={styles.repayText}>{repaying === item.id ? 'Updating…' : 'Mark repaid  ↙'}</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.received}>
                    {item.repaidAt ? `Received ${dateLabel(item.repaidAt)}` : 'All settled'}
                  </Text>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>{filter === 'Repaid' ? '✓' : '↗'}</Text></View>
            <Text style={[s.subtitle, styles.center]}>
              {loading ? 'A moment of clarity…' : error ? 'Let’s reconnect.' : filter === 'All' ? 'Start with a clean slate.' : `No ${filter.toLowerCase()} loans.`}
            </Text>
            <Text style={[s.body, styles.center]}>
              {loading ? 'Bringing your entries up to date.' : error ? 'Refresh to bring your ledger back.' : filter === 'All'
                ? 'A coffee, a dinner, a helping hand. Add a loan and we’ll help you remember.'
                : 'Nothing to keep track of here right now.'}
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.account}>{session.phone}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 32, maxWidth: 600, width: '100%', alignSelf: 'center', flexGrow: 1 },
  header: { gap: 20, marginBottom: 16 },
  signOut: { backgroundColor: c.white, borderRadius: 24, minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  signOutText: { color: c.body, fontSize: 12, fontWeight: '600' },
  intro: { gap: 12, paddingTop: 12, paddingBottom: 4 },
  heading: { fontSize: 38, lineHeight: 40, fontWeight: '900', letterSpacing: -1.5, color: c.ink },
  balanceCard: { backgroundColor: c.ink, padding: 24, borderRadius: 24, gap: 16 },
  balanceLabel: { fontSize: 14, color: c.canvas },
  balanceIcon: { height: 32, width: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#454b3c' },
  balanceIconText: { color: c.primary, fontSize: 22 },
  balance: { color: c.primary, fontSize: 52, lineHeight: 60, fontWeight: '900', letterSpacing: -2 },
  balanceFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: '#34392f', paddingTop: 16 },
  statusDot: { height: 6, width: 6, borderRadius: 3, backgroundColor: c.primary },
  balanceCaption: { color: '#c5cbbf', fontSize: 12, flexShrink: 1 },
  stats: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: c.white, borderRadius: 24, padding: 14, gap: 8 },
  statIcon: { fontSize: 22, fontWeight: '600', height: 28 },
  statValue: { fontSize: 18, fontWeight: '600', letterSpacing: -0.5 },
  entriesHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12 },
  count: { fontSize: 12, color: c.body, backgroundColor: c.white, minWidth: 28, textAlign: 'center', borderRadius: 14, overflow: 'hidden', padding: 6 },
  filters: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filter: { paddingHorizontal: 16, paddingVertical: 12, minHeight: 44, borderRadius: 24, backgroundColor: c.white },
  filterActive: { backgroundColor: c.forest },
  filterLabel: { fontSize: 13, fontWeight: '600', color: c.body },
  filterLabelActive: { color: c.white },
  entry: { borderRadius: 24, padding: 20, borderWidth: 1, borderColor: c.white, backgroundColor: c.white, gap: 20, marginBottom: 12 },
  overdueEntry: { borderColor: c.negative },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  personInfo: { flex: 1, gap: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.canvas, justifyContent: 'center', alignItems: 'center' },
  avatarRepaid: { backgroundColor: c.pale },
  initials: { fontSize: 14, fontWeight: '600', color: c.forest },
  amount: { fontSize: 22, fontWeight: '600', letterSpacing: -0.7, color: c.ink, flexShrink: 1, maxWidth: '45%' },
  entryBottom: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.canvas },
  badge: { backgroundColor: c.warning, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  badgeText: { fontSize: 12, color: c.warningContent, fontWeight: '600' },
  repaidBadge: { backgroundColor: c.pale },
  repaidText: { color: c.positiveDeep },
  overdueBadge: { backgroundColor: c.negativeBg },
  overdueText: { color: c.white },
  repay: { minHeight: 44, backgroundColor: c.canvas, borderRadius: 24, paddingHorizontal: 14, justifyContent: 'center' },
  repayText: { color: c.forest, fontSize: 12, fontWeight: '600' },
  received: { color: c.body, fontSize: 11 },
  empty: { padding: 28, paddingVertical: 36, backgroundColor: c.white, borderRadius: 24, alignItems: 'center', gap: 16 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.canvas, alignItems: 'center', justifyContent: 'center' },
  emptyIconText: { fontSize: 32, color: c.forest },
  center: { textAlign: 'center' },
  footer: { alignItems: 'center', gap: 8, paddingTop: 32 },
  footerMark: { fontSize: 24, fontWeight: '900', color: c.forest },
  account: { fontSize: 10, color: c.body, letterSpacing: 1, marginTop: 6 },
});
