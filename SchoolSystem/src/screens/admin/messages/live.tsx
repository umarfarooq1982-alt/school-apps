// Messages & broadcast (M-19) backed by /api/web/outbox, /notices and
// /modules/messages. Templates, scheduling and SMS credit stay on the tools screen.
import React, { useState } from 'react';
import { View } from 'react-native';
import { Bell, MessageSquare, RefreshCw, Send } from 'lucide-react-native';
import { Badge, Button, Card, Chips, Field, InfoBanner, ListRow, Segmented, toast } from '../../../components/ui';
import { KV, PickerField } from '../../../components/admin';
import { QueryView } from '../../../components/states';
import { useApi, useMutation } from '../../../api/hooks';
import { messagesApi } from '../../../api/webB';
import { ScreenProps } from '../../../navigation';
import { logAudit, useReadOnly, useRules } from '../../../data/admin';
import { fmtDate, LiveScreen, liveStyles as ls, StatusBadge } from '../accounts/live-kit';

const AUDIENCES = ['all', 'parent', 'staff', 'student'];

// Quiet hours like "9:00 PM – 7:00 AM" (S-13 settings).
function inQuietHours(range: string, now = new Date()) {
  const m = range.match(/(\d{1,2}):(\d{2})\s*(AM|PM).*?(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) {
    return false;
  }
  const toMin = (h: string, min: string, ap: string) => ((Number(h) % 12) + (ap.toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(min);
  const a = toMin(m[1], m[2], m[3]);
  const b = toMin(m[4], m[5], m[6]);
  const t = now.getHours() * 60 + now.getMinutes();
  return a > b ? t >= a || t < b : t >= a && t < b;
}

export function AdminMessagesLive(_: ScreenProps) {
  const [tab, setTab] = useState('Outbox');
  const outbox = useApi('web:outbox', () => messagesApi.outbox());
  const gateway = useApi('web:outbox:status', () => messagesApi.status());
  const notices = useApi('web:notices', () => messagesApi.notices());
  const [rules] = useRules();
  const readOnly = useReadOnly();
  const [filter, setFilter] = useState('All');
  const retry = useMutation(messagesApi.retry, 'Sent again');
  const publish = useMutation(messagesApi.publish, 'Notice published');
  const send = useMutation(messagesApi.send, 'Message queued');
  const [n, setN] = useState<Record<string, string>>({ audience: 'all' });
  const [m, setM] = useState<Record<string, string>>({ channel: 'whatsapp' });

  const rows = (outbox.data ?? []).filter(o => filter === 'All' || o.status === filter.toLowerCase());
  const q = tab === 'Notices' ? notices : outbox;

  const doPublish = async () => {
    if (!n.title?.trim() || !n.body?.trim()) {
      toast('Enter a title and the message');
      return;
    }
    if ((await publish.run({ title: n.title.trim(), body: n.body.trim(), bodyUrdu: n.bodyUrdu?.trim() || undefined, audience: n.audience })) !== undefined) {
      logAudit('Broadcast', `Notice "${n.title.trim()}" to ${n.audience}`);
      setN({ audience: 'all' });
      notices.refresh();
    }
  };

  const doSend = async () => {
    if (!m.recipient?.trim() || !m.body?.trim()) {
      toast('Enter the mobile/email and the message');
      return;
    }
    if (inQuietHours(rules.quietHours)) {
      toast(`Quiet hours (${rules.quietHours}). The message is queued and goes out at 7:00 AM.`);
    }
    if ((await send.run({ channel: m.channel, recipient: m.recipient.trim(), body: m.body.trim() })) !== undefined) {
      logAudit('Message', `${m.channel} to ${m.recipient.trim()}`);
      setM({ channel: m.channel });
      outbox.refresh();
    }
  };

  return (
    <LiveScreen title="Messages & broadcast" subtitle="SMS, WhatsApp, email and push from one place" q={q} toolsRoute="AdminMessagesTools" toolsLabel="Templates, scheduling, alert toggles & SMS credit (sample)">
      <QueryView q={gateway}>
        {g => (
          <Card title="Gateways">
            <KV k="SMS" v={<Badge label={g.sms ? `On${g.smsProvider ? ` · ${g.smsProvider}` : ''}` : 'Not set up'} tone={g.sms ? 'success' : 'danger'} />} />
            <KV k="WhatsApp" v={<Badge label={g.whatsapp ? `On${g.whatsappProvider ? ` · ${g.whatsappProvider}` : ''}` : 'Not set up'} tone={g.whatsapp ? 'success' : 'danger'} />} last />
            {!g.sms && !g.whatsapp ? <InfoBanner tone="warn" text="No gateway keys on the server, so messages are logged as 'skipped' and not delivered." /> : null}
          </Card>
        )}
      </QueryView>
      <Segmented options={['Outbox', 'Notices', 'Send']} value={tab} onChange={setTab} />
      {tab === 'Outbox' ? (
        <>
          <Chips options={['All', 'Queued', 'Sent', 'Failed', 'Skipped']} value={filter} onChange={setFilter} />
          <QueryView q={outbox} isEmpty={() => !rows.length} emptyText="No messages here.">
            {() => (
              <Card>
                {rows.map((o, i) => (
                  <ListRow
                    key={o.id}
                    icon={MessageSquare}
                    title={`${o.channel} · ${o.target ?? '—'}`}
                    subtitle={`${o.body} · ${o.event_key} · ${fmtDate(o.created_at)}`}
                    right={
                      <View style={ls.right}>
                        <StatusBadge status={o.status} />
                        {o.status === 'failed' || o.status === 'skipped' ? (
                          <Button
                            label="Retry"
                            icon={RefreshCw}
                            variant="outline"
                            onPress={async () => {
                              if ((await retry.run(o.id)) !== undefined) {
                                outbox.refresh();
                              }
                            }}
                          />
                        ) : null}
                      </View>
                    }
                    last={i === rows.length - 1}
                  />
                ))}
              </Card>
            )}
          </QueryView>
        </>
      ) : tab === 'Notices' ? (
        <>
          <Card title="Publish notice / broadcast">
            <PickerField label="To" value={n.audience} options={AUDIENCES} onChange={v => setN(p => ({ ...p, audience: v }))} />
            <Field label="Title *" value={n.title ?? ''} onChangeText={v => setN(p => ({ ...p, title: v }))} />
            <Field label="Message (English) *" value={n.body ?? ''} onChangeText={v => setN(p => ({ ...p, body: v }))} multiline />
            <Field label="Message (Urdu)" value={n.bodyUrdu ?? ''} onChangeText={v => setN(p => ({ ...p, bodyUrdu: v }))} multiline />
            <Button label="Publish" icon={Bell} onPress={doPublish} loading={publish.busy} disabled={readOnly} />
          </Card>
          <QueryView q={notices} isEmpty={d => !d.length} emptyText="No notices yet.">
            {d => (
              <Card title="Published">
                {d.map((x, i) => (
                  <ListRow key={x.id} icon={Bell} title={x.title} subtitle={`${x.text}${x.bodyUrdu ? ` · ${x.bodyUrdu}` : ''} · ${fmtDate(x.at)}`} right={<Badge label={x.audience} tone="info" />} last={i === d.length - 1} />
                ))}
              </Card>
            )}
          </QueryView>
        </>
      ) : (
        <Card title="Send a message">
          <Chips options={['whatsapp', 'sms', 'email']} value={m.channel} onChange={v => setM(p => ({ ...p, channel: v }))} />
          <Field label="Mobile / email *" value={m.recipient ?? ''} onChangeText={v => setM(p => ({ ...p, recipient: v }))} autoCapitalize="none" />
          <Field label="Message *" value={m.body ?? ''} onChangeText={v => setM(p => ({ ...p, body: v }))} multiline />
          <Button label="Send" icon={Send} onPress={doSend} loading={send.busy} disabled={readOnly} />
        </Card>
      )}
    </LiveScreen>
  );
}
