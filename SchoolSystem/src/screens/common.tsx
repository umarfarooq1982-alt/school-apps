import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Briefcase, GraduationCap, Lock } from 'lucide-react-native';
import { Button, Card, Field, InfoBanner, Screen, toast } from '../components/ui';
import { QueryView } from '../components/states';
import { colors } from '../theme';
import { ScreenMap, useNav } from '../navigation';
import { useSession } from '../store';
import { authApi } from '../api/mobile';
import { api } from '../api/client';
import { useApi, useMutation } from '../api/hooks';
import { useSchoolName } from '../api/tenant';
import { useI18n } from '../i18n';

type NoticeRow = { id: string | number; title: string; body: string; bodyUrdu?: string | null; at: string };

function when(at: string) {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 60) {
    return `${Math.max(1, mins)}m`;
  }
  if (mins < 24 * 60) {
    return `${Math.round(mins / 60)}h`;
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Notifications: the school's real notices for this login (parents, students
// and teachers from the mobile API, staff from the web API).
function Notifications() {
  const { role } = useSession();
  const { t, lang } = useI18n();
  const schoolName = useSchoolName();
  const q = useApi<NoticeRow[]>(`notices.${role}`, async () => {
    if (role === 'admin') {
      const rows = await api.get<
        Array<{ id: string; title: string; text?: string; body?: string; bodyUrdu?: string | null; at: string }>
      >('/api/web/notices');
      return rows.map(r => ({ id: r.id, title: r.title, body: r.text ?? r.body ?? '', bodyUrdu: r.bodyUrdu, at: r.at }));
    }
    const rows = await api.get<Array<{ id: number; title: string; body: string; bodyUrdu: string | null; at: string }>>(
      '/api/mobile/notices',
    );
    return rows.map(r => ({ id: r.id, title: r.title, body: r.body, bodyUrdu: r.bodyUrdu, at: r.at }));
  });
  const Icon = role === 'teacher' ? Briefcase : GraduationCap;
  return (
    <Screen title="Notifications" subtitle={schoolName} refreshing={q.refreshing} onRefresh={q.refresh}>
      <QueryView q={q} isEmpty={d => d.length === 0} emptyText="No notices yet.">
        {rows => (
          <Card>
            {rows.map((n, i) => (
              <View key={String(n.id)} style={[s.row, i < rows.length - 1 && s.rowDivider]}>
                <View style={s.noteIcon}>
                  <Icon size={16} color={colors.text} />
                </View>
                <View style={s.flex}>
                  <View style={s.noteHead}>
                    <Text style={s.noteTitle} numberOfLines={1}>
                      {n.title}
                    </Text>
                    <Text style={s.noteWhen}>{when(n.at)}</Text>
                  </View>
                  <Text style={s.noteText}>{lang === 'ur' && n.bodyUrdu ? n.bodyUrdu : n.body}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}
      </QueryView>
      <Text style={s.hint}>{t('Phone push alerts start once the school turns them on.')}</Text>
    </Screen>
  );
}

function ChangePassword() {
  const nav = useNav();
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const { run, busy } = useMutation(authApi.changePassword, 'Password changed');
  const save = async () => {
    if (!cur) {
      toast('Enter the current password');
    } else if (pw.length < 6) {
      toast('Password must be at least 6 characters');
    } else if (pw !== pw2) {
      toast('Passwords do not match');
    } else if ((await run(cur, pw)) !== undefined) {
      nav.pop();
    }
  };
  return (
    <Screen
      title="Change password"
      footer={<Button label="Change password" onPress={save} loading={busy} />}
    >
      <Field label="Current password" icon={Lock} value={cur} onChangeText={setCur} secureTextEntry />
      <Field label="New password" icon={Lock} value={pw} onChangeText={setPw} secureTextEntry />
      <Field label="Repeat new password" icon={Lock} value={pw2} onChangeText={setPw2} secureTextEntry />
      <InfoBanner
        icon={Lock}
        text="At least 6 characters. You will sign in again with the new password."
      />
    </Screen>
  );
}

export const commonScreens: ScreenMap = { Notifications, ChangePassword };

const s = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 10, paddingVertical: 11 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  noteIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  noteTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.text },
  noteWhen: { fontSize: 11.5, color: colors.textMuted },
  noteText: { fontSize: 13, color: colors.text, marginTop: 2, lineHeight: 18 },
  hint: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
