// Notifications and broadcast (SOW M-19): channels, automatic alerts,
// broadcast with templates and scheduling, quiet hours, delivery log, credit.
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Bell, FileText, Mail, MessageCircle, Send, Smartphone } from 'lucide-react-native';
import {
  Badge,
  Button,
  Card,
  Field,
  InfoBanner,
  ListRow,
  Screen,
  Segmented,
  Toggle,
  toast,
} from '../../../components/ui';
import { FormSheet, KV, ListScreen, PickerField } from '../../../components/admin';
import { colors } from '../../../theme';
import { ScreenMap, ScreenProps, useNav } from '../../../navigation';
import { CLASSES, SECTIONS, logAudit, useReadOnly, useRules } from '../../../data/admin';
import {
  AUDIENCES,
  AUTO_ALERTS,
  ChannelKey,
  Delivery,
  Template,
  fillTemplate,
  inQuietHours,
  msgId,
  quietEnd,
  recipientCount,
  useAutoAlerts,
  useChannels,
  useDeliveryLog,
  useSmsCredit,
  useTemplates,
} from '../../../data/admin-messages';
import { ReadOnlyBanner, SmallBtn } from '../transport/screens';

const CHANNEL_ICON: Record<ChannelKey, typeof Bell> = {
  SMS: Smartphone,
  WhatsApp: MessageCircle,
  Email: Mail,
  Push: Bell,
};

const SCHEDULE_TIMES = ['4:00 PM', '6:30 PM', '9:30 PM', '11:00 PM', '6:00 AM', '7:30 AM', '8:00 AM'];

const statusTone = (s: Delivery['status']) =>
  s === 'Delivered' ? 'success' : s === 'Failed' ? 'danger' : s === 'Partly failed' ? 'warn' : 'info';

export function AdminMessages(_: ScreenProps) {
  const nav = useNav();
  const ro = useReadOnly();
  const [rules] = useRules();
  const [channels, setChannels] = useChannels();
  const [auto, setAuto] = useAutoAlerts();
  const [templates] = useTemplates();
  const [, setLog] = useDeliveryLog();
  const [credit, setCredit] = useSmsCredit();

  const [audience, setAudience] = useState('All parents');
  const [cls, setCls] = useState('Class 5');
  const [section, setSection] = useState('A');
  const [picked, setPicked] = useState<Record<ChannelKey, boolean>>({ SMS: true, WhatsApp: false, Email: false, Push: true });
  const [lang, setLang] = useState('English');
  const [templateName, setTemplateName] = useState('');
  const [message, setMessage] = useState('');
  const [when, setWhen] = useState('Send now');
  const [time, setTime] = useState('4:00 PM');

  const recipients = recipientCount(audience);
  const target =
    audience === 'A class' ? `${cls} parents` : audience === 'A section' ? `${cls}-${section} parents` : audience;
  const langTemplates = templates.filter(t => t.lang === lang);
  const quiet = when === 'Schedule' && inQuietHours(time, rules.quietHours);
  const finalTime = quiet ? quietEnd(rules.quietHours) : time;
  const perSms = lang === 'Urdu' ? 2 : 1; // Urdu (Unicode) SMS uses 2 credits
  const smsCost = picked.SMS ? recipients * perSms : 0;

  const toggleChannel = (key: ChannelKey, on: boolean) => {
    setChannels(list => list.map(c => (c.key === key ? { ...c, enabled: on } : c)));
    logAudit('Integrations', `${key} channel ${on ? 'enabled' : 'disabled'}`);
  };

  const pickTemplate = (name: string) => {
    setTemplateName(name);
    const t = langTemplates.find(x => x.name === name);
    if (t) {
      setMessage(t.text);
    }
  };

  const send = () => {
    const chosen = channels.filter(c => picked[c.key]);
    if (!message.trim()) {
      toast('Write the message or pick a template');
      return;
    }
    if (!chosen.length) {
      toast('Choose at least one channel');
      return;
    }
    const off = chosen.find(c => !c.enabled);
    if (off) {
      toast(`${off.name} is switched off. Turn it on above first.`);
      return;
    }
    if (smsCost > credit) {
      toast(`Not enough SMS credit: need ${smsCost}, have ${credit}.`);
      return;
    }
    const title = templateName || message.trim().slice(0, 28);
    const entries: Delivery[] = chosen.map(c => {
      if (when === 'Schedule') {
        return { id: msgId('dl'), title, to: target, channel: c.key, when: `Scheduled ${finalTime}`, recipients, delivered: 0, failed: 0, status: 'Scheduled' };
      }
      const failed = c.key === 'SMS' || c.key === 'WhatsApp' ? Math.round(recipients * 0.01) : 0;
      return {
        id: msgId('dl'),
        title,
        to: target,
        channel: c.key,
        when: 'Just now',
        recipients,
        delivered: recipients - failed,
        failed,
        status: failed ? 'Partly failed' : 'Delivered',
      };
    });
    setLog(list => [...entries, ...list]);
    if (smsCost) {
      setCredit(c => c - smsCost);
    }
    logAudit('Broadcast', `"${title}" to ${target} (${recipients}) via ${chosen.map(c => c.key).join(', ')}${when === 'Schedule' ? ` at ${finalTime}` : ''}`);
    toast(when === 'Schedule' ? `Scheduled for ${finalTime}` : `Sent to ${recipients} recipients`);
    setMessage('');
    setTemplateName('');
  };

  return (
    <Screen
      title="Messages & broadcast"
      subtitle="SMS, WhatsApp, email and push from one place"
      footer={ro ? undefined : <Button label={when === 'Schedule' ? `Schedule for ${finalTime}` : `Send to ${recipients}`} icon={Send} onPress={send} />}
    >
      {ro ? <ReadOnlyBanner /> : null}
      <Card title="Channels">
        {channels.map((c, i) => {
          const Icon = CHANNEL_ICON[c.key];
          return (
            <ListRow
              key={c.key}
              icon={Icon}
              title={c.name}
              subtitle={c.provider}
              right={
                <View style={s.row}>
                  <Badge label={c.enabled ? c.status : 'Off'} tone={c.enabled ? 'success' : 'neutral'} />
                  <Toggle value={c.enabled} onChange={on => (ro ? toast('Read-only session') : toggleChannel(c.key, on))} />
                </View>
              }
              last={i === channels.length - 1}
            />
          );
        })}
        <KV
          k="SMS credit balance"
          v={<Badge label={`${credit.toLocaleString('en-US')} SMS`} tone={credit < 1000 ? 'danger' : 'success'} />}
          last
        />
        <View style={s.row}>
          <SmallBtn label="Buy credit" tone="outline" onPress={() => toast('Credit request sent to the SMS provider (demo)')} />
          <SmallBtn label="Delivery log" onPress={() => nav.push('AdminMessageLog')} />
          <SmallBtn label="Templates" onPress={() => nav.push('AdminMessageTemplates')} />
        </View>
      </Card>

      <Card title="Automatic alerts">
        {AUTO_ALERTS.map((a, i) => (
          <ListRow
            key={a.key}
            icon={Bell}
            title={a.label}
            subtitle={a.sub}
            right={
              <Toggle
                value={auto[a.key] ?? true}
                onChange={on => {
                  if (ro) {
                    toast('Read-only session');
                    return;
                  }
                  setAuto(p => ({ ...p, [a.key]: on }));
                  logAudit('Notifications', `Automatic alert "${a.label}" turned ${on ? 'on' : 'off'}`);
                }}
              />
            }
            last={i === AUTO_ALERTS.length - 1}
          />
        ))}
      </Card>

      <Card title="Broadcast">
        <View style={s.form}>
          <PickerField label="Send to" value={audience} options={AUDIENCES} onChange={setAudience} />
          {audience === 'A class' || audience === 'A section' ? (
            <PickerField label="Class" value={cls} options={CLASSES} onChange={setCls} />
          ) : null}
          {audience === 'A section' ? (
            <PickerField label="Section" value={section} options={SECTIONS} onChange={setSection} />
          ) : null}
          <Text style={s.muted}>
            {target}: {recipients.toLocaleString('en-US')} recipients
          </Text>
          <Text style={s.label}>Channels</Text>
          {channels.map(c => (
            <View key={c.key} style={s.channel}>
              <Text style={s.channelText}>{c.name}</Text>
              <Toggle value={picked[c.key]} onChange={on => setPicked(p => ({ ...p, [c.key]: on }))} />
            </View>
          ))}
          <Segmented
            options={['English', 'Urdu']}
            value={lang}
            onChange={v => {
              setLang(v);
              setTemplateName('');
            }}
          />
          <PickerField
            label="Template"
            value={templateName}
            options={langTemplates.map(t => t.name)}
            onChange={pickTemplate}
            placeholder="Optional: pick a template"
          />
          <Field
            label="Message"
            value={message}
            onChangeText={setMessage}
            multiline
            placeholder="Use {student_name}, {amount}, {due_date}"
          />
          {message ? (
            <View style={s.preview}>
              <Text style={s.previewLabel}>Preview</Text>
              <Text style={[s.previewText, lang === 'Urdu' && s.rtl]}>{fillTemplate(message)}</Text>
            </View>
          ) : null}
          <Segmented options={['Send now', 'Schedule']} value={when} onChange={setWhen} />
          {when === 'Schedule' ? (
            <PickerField label="Send at" value={time} options={SCHEDULE_TIMES} onChange={setTime} />
          ) : null}
          {quiet ? (
            <InfoBanner
              tone="warn"
              text={`${time} is inside quiet hours (${rules.quietHours}). It will be sent at ${finalTime}.`}
            />
          ) : null}
          {picked.SMS ? (
            <Text style={s.muted}>
              SMS cost: {smsCost.toLocaleString('en-US')} credits ({perSms} per message{lang === 'Urdu' ? ', Urdu' : ''})
            </Text>
          ) : null}
        </View>
      </Card>
    </Screen>
  );
}

export function AdminMessageLog(_: ScreenProps) {
  const ro = useReadOnly();
  const [log, setLog] = useDeliveryLog();
  const [credit, setCredit] = useSmsCredit();
  const retry = (d: Delivery) => {
    if (d.channel === 'SMS' && d.failed > credit) {
      toast('Not enough SMS credit to retry');
      return;
    }
    if (d.channel === 'SMS') {
      setCredit(c => c - d.failed);
    }
    setLog(list => list.map(x => (x.id === d.id ? { ...x, delivered: x.delivered + x.failed, failed: 0, status: 'Delivered' } : x)));
    logAudit('Delivery log', `Retried ${d.failed} failed ${d.channel} messages for "${d.title}"`);
    toast(`${d.failed} messages re-sent`);
  };
  return (
    <ListScreen
      title="Delivery log"
      subtitle={`SMS credit ${credit.toLocaleString('en-US')}`}
      items={log}
      keyOf={d => d.id}
      searchText={d => `${d.title} ${d.to} ${d.channel}`}
      filters={[
        { label: 'Channel', options: ['All', 'SMS', 'WhatsApp', 'Email', 'Push'], get: d => d.channel },
        { label: 'Status', options: ['All', 'Delivered', 'Partly failed', 'Failed', 'Scheduled'], get: d => d.status },
      ]}
      header={ro ? <ReadOnlyBanner /> : null}
      renderItem={(d, last) => (
        <ListRow
          icon={CHANNEL_ICON[d.channel]}
          title={`${d.title} · ${d.channel}`}
          subtitle={`${d.to} · ${d.when} · ${d.delivered}/${d.recipients} delivered${d.failed ? ` · ${d.failed} failed` : ''}`}
          right={
            d.failed && !ro ? (
              <SmallBtn label="Retry failed" onPress={() => retry(d)} />
            ) : (
              <Badge label={d.status} tone={statusTone(d.status)} />
            )
          }
          last={last}
        />
      )}
    />
  );
}

function TemplateForm({ initial, onClose }: { initial?: Template; onClose: () => void }) {
  const [, setTemplates] = useTemplates();
  const [name, setName] = useState(initial?.name ?? '');
  const [lang, setLang] = useState<string>(initial?.lang ?? 'English');
  const [text, setText] = useState(initial?.text ?? '');
  const submit = () => {
    if (!name.trim() || !text.trim()) {
      toast('Enter the template name and text');
      return;
    }
    const t: Template = { id: initial?.id ?? msgId('tp'), name: name.trim(), lang: lang === 'Urdu' ? 'Urdu' : 'English', text: text.trim() };
    setTemplates(list => (initial ? list.map(x => (x.id === t.id ? t : x)) : [...list, t]));
    logAudit('Templates', `${initial ? 'Updated' : 'Added'} message template "${t.name}" (${t.lang})`);
    toast('Template saved');
    onClose();
  };
  return (
    <FormSheet visible onClose={onClose} title={initial ? 'Edit template' : 'New template'} onSubmit={submit}>
      <Field label="Name" value={name} onChangeText={setName} />
      <Segmented options={['English', 'Urdu']} value={lang} onChange={setLang} />
      <Field label="Text" value={text} onChangeText={setText} multiline />
      <Text style={s.muted}>Variables: {'{student_name}'}, {'{amount}'}, {'{due_date}'}</Text>
      {text ? (
        <View style={s.preview}>
          <Text style={s.previewLabel}>Preview</Text>
          <Text style={[s.previewText, lang === 'Urdu' && s.rtl]}>{fillTemplate(text)}</Text>
        </View>
      ) : null}
    </FormSheet>
  );
}

export function AdminMessageTemplates(_: ScreenProps) {
  const ro = useReadOnly();
  const [templates] = useTemplates();
  const [form, setForm] = useState<Template | 'new' | null>(null);
  return (
    <>
      <ListScreen
        title="Message templates"
        subtitle="English and Urdu with variables"
        items={templates}
        keyOf={t => t.id}
        searchText={t => `${t.name} ${t.text}`}
        filters={[{ label: 'Language', options: ['All', 'English', 'Urdu'], get: t => t.lang }]}
        header={ro ? <ReadOnlyBanner /> : null}
        renderItem={(t, last) => (
          <ListRow
            icon={FileText}
            title={t.name}
            subtitle={fillTemplate(t.text)}
            right={<Badge label={t.lang} tone={t.lang === 'Urdu' ? 'info' : 'neutral'} />}
            onPress={ro ? undefined : () => setForm(t)}
            last={last}
          />
        )}
        onAdd={ro ? undefined : () => setForm('new')}
        addLabel="New template"
      />
      {form ? <TemplateForm initial={form === 'new' ? undefined : form} onClose={() => setForm(null)} /> : null}
    </>
  );
}

export const messagesScreens: ScreenMap = {
  AdminMessages,
  AdminMessageLog,
  AdminMessageTemplates,
};

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  form: { gap: 12 },
  label: { fontSize: 12.5, fontWeight: '800', color: colors.text },
  muted: { fontSize: 12.5, color: colors.textMuted, lineHeight: 18 },
  channel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  channelText: { fontSize: 14, fontWeight: '700', color: colors.text },
  preview: { backgroundColor: colors.neutralSoft, borderRadius: 10, padding: 10, gap: 4 },
  previewLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
  previewText: { fontSize: 13.5, color: colors.text, lineHeight: 20 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
});
