import React, { createContext, useContext, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  ToastAndroid,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Info,
  LucideIcon,
  Star,
} from 'lucide-react-native';
import { colors, radius, Tone, toneColors } from '../theme';
import { useNav } from '../navigation';
import { useI18n } from '../i18n';

export type IconType = LucideIcon;

// ---------- Feedback ----------

export function toast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert(message);
  }
}

// ---------- Text ----------

type TxtProps = {
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

export function Title({ children, style }: TxtProps) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Label({ children, style }: TxtProps) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Body({ children, style, numberOfLines }: TxtProps) {
  return (
    <Text style={[styles.body, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Muted({ children, style, numberOfLines }: TxtProps) {
  return (
    <Text style={[styles.muted, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

// ---------- Screen layout ----------

// True when the screen is rendered inside a bottom tab bar.
export const InTabsContext = createContext(false);

export function IconButton({
  icon: Icon,
  onPress,
  badge,
  style,
  color = colors.text,
}: {
  icon: IconType;
  onPress?: () => void;
  badge?: number;
  style?: StyleProp<ViewStyle>;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconBtn,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Icon size={20} color={color} strokeWidth={2} />
      {badge ? (
        <View style={styles.badgeDot}>
          <Text style={styles.badgeDotText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function BellButton({ count = 4 }: { count?: number }) {
  const nav = useNav();
  return (
    <IconButton
      icon={Bell}
      badge={count}
      onPress={() => nav.push('Notifications')}
    />
  );
}

type ScreenProps = {
  title?: string;
  subtitle?: string;
  back?: boolean; // default: shown when the screen was pushed
  right?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  scroll?: boolean;
  header?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({
  title,
  subtitle,
  back,
  right,
  children,
  footer,
  scroll = true,
  header,
  contentStyle,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const inTabs = useContext(InTabsContext);
  const nav = useNav();
  const { t, isRTL } = useI18n();
  const bottomPad = inTabs ? 0 : insets.bottom;
  // Pushed screens get a back button; tab roots never do.
  const showBack = (back ?? true) && !inTabs && nav.canGoBack;

  const head = header ?? (
    <View style={styles.header}>
      {showBack ? (
        <IconButton
          icon={isRTL ? ChevronRight : ChevronLeft}
          onPress={nav.pop}
          style={styles.backBtn}
        />
      ) : null}
      <View style={styles.flex}>
        {title ? (
          <Text style={styles.screenTitle} numberOfLines={2}>
            {t(title)}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={styles.screenSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        !footer && { paddingBottom: 24 + bottomPad },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, styles.contentNoScroll, contentStyle]}>
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {head}
      {body}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: 12 + bottomPad }]}>
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

// ---------- Containers ----------

export function Card({
  children,
  title,
  action,
  style,
  padded = true,
}: {
  children?: React.ReactNode;
  title?: string;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const { t } = useI18n();
  return (
    <View style={[styles.card, padded && styles.cardPadded, style]}>
      {title || action ? (
        <View style={styles.cardHead}>
          {title ? <Text style={styles.cardTitle}>{t(title)}</Text> : null}
          <View style={styles.flex} />
          {action ? (
            <Pressable onPress={action.onPress} hitSlop={8}>
              <Text style={styles.cardAction}>{t(action.label)}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Gap({ h = 12 }: { h?: number }) {
  return <View style={{ height: h }} />;
}

export function RowWrap({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.rowWrap, style]}>{children}</View>;
}

export function HStack({
  children,
  style,
  gap = 10,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}) {
  return <View style={[styles.hstack, { gap }, style]}>{children}</View>;
}

export function IconTile({
  icon: Icon,
  tone = 'primary',
  size = 36,
}: {
  icon: IconType;
  tone?: 'primary' | 'danger' | 'success' | 'info' | 'neutral';
  size?: number;
}) {
  const map = {
    primary: { bg: colors.primarySoft, fg: colors.primaryText },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    success: { bg: colors.successSoft, fg: colors.success },
    info: { bg: colors.infoSoft, fg: colors.info },
    neutral: { bg: colors.neutralSoft, fg: colors.textMuted },
  }[tone];
  return (
    <View
      style={[
        styles.iconTile,
        { width: size, height: size, backgroundColor: map.bg },
      ]}
    >
      <Icon size={size * 0.5} color={map.fg} strokeWidth={2} />
    </View>
  );
}

// A row inside a Card: optional icon/avatar on the left, title + subtitle, and
// something on the right (badge, amount, chevron).
export function ListRow({
  icon,
  iconTone,
  avatar,
  title,
  subtitle,
  right,
  onPress,
  last,
  chevron,
  titleStyle,
}: {
  icon?: IconType;
  iconTone?: 'primary' | 'danger' | 'success' | 'info' | 'neutral';
  avatar?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
  chevron?: boolean;
  titleStyle?: StyleProp<TextStyle>;
}) {
  const { isRTL } = useI18n();
  const content = (
    <View style={[styles.listRow, !last && styles.divider]}>
      {icon ? <IconTile icon={icon} tone={iconTone} /> : null}
      {avatar ? <Avatar name={avatar} /> : null}
      <View style={styles.flex}>
        {typeof title === 'string' ? (
          <Text style={[styles.rowTitle, titleStyle]}>{title}</Text>
        ) : (
          title
        )}
        {subtitle ? (
          typeof subtitle === 'string' ? (
            <Text style={styles.rowSub}>{subtitle}</Text>
          ) : (
            subtitle
          )
        ) : null}
      </View>
      {right}
      {chevron ? (
        isRTL ? (
          <ChevronLeft size={18} color={colors.text} />
        ) : (
          <ChevronRight size={18} color={colors.text} />
        )
      ) : null}
    </View>
  );
  if (!onPress) {
    return content;
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

// ---------- Small pieces ----------

export function Badge({
  label,
  tone = 'neutral',
  style,
}: {
  label: string;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useI18n();
  const c = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, style]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{t(label)}</Text>
    </View>
  );
}

export function Avatar({
  name,
  size = 40,
  ring,
}: {
  name: string;
  size?: number;
  ring?: boolean;
}) {
  const initials = useMemo(
    () =>
      name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0]?.toUpperCase())
        .join(''),
    [name],
  );
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        ring && styles.avatarRing,
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.34 }]}>
        {initials}
      </Text>
    </View>
  );
}

export function Amount({
  value,
  style,
  tone,
}: {
  value: number;
  style?: StyleProp<TextStyle>;
  tone?: 'danger' | 'success';
}) {
  return (
    <Text
      style={[
        styles.amount,
        tone === 'danger' && { color: colors.danger },
        tone === 'success' && { color: colors.success },
        style,
      ]}
    >
      {formatRs(value)}
    </Text>
  );
}

export function formatRs(value: number) {
  const sign = value < 0 ? '- ' : '';
  return `${sign}Rs. ${Math.abs(value).toLocaleString('en-US')}`;
}

export function InfoBanner({
  text,
  tone = 'info',
  icon: Icon = Info,
  style,
}: {
  text: React.ReactNode;
  tone?: 'info' | 'warn' | 'danger' | 'success';
  icon?: IconType;
  style?: StyleProp<ViewStyle>;
}) {
  const c = toneColors[tone];
  return (
    <View style={[styles.banner, { backgroundColor: c.bg }, style]}>
      <Icon size={15} color={c.fg} strokeWidth={2.2} style={styles.bannerIcon} />
      <Text style={[styles.bannerText, { color: c.fg }]}>{text}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon: Icon,
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'danger';
  icon?: IconType;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useI18n();
  const isPrimary = variant === 'primary';
  const fg = variant === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        isPrimary ? styles.btnPrimary : styles.btnOutline,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {Icon ? <Icon size={18} color={fg} strokeWidth={2.2} /> : null}
          <Text style={[styles.btnText, { color: fg }]}>{t(label)}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  icon: Icon,
  style,
  prefix,
  onPress,
  value,
  ...rest
}: TextInputProps & {
  label?: string;
  icon?: IconType;
  prefix?: string;
  onPress?: () => void;
}) {
  const { t, isRTL } = useI18n();
  const [focused, setFocused] = React.useState(false);
  const box = (
    <View
      style={[
        styles.field,
        rest.multiline && styles.fieldMulti,
        focused && styles.fieldFocused,
      ]}
    >
      {Icon ? (
        <Icon size={18} color={colors.text} strokeWidth={1.8} />
      ) : null}
      {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
      {onPress ? (
        <Text style={[styles.input, styles.inputText]}>{value}</Text>
      ) : (
        <TextInput
          {...rest}
          value={value}
          placeholderTextColor={colors.textFaint}
          onFocus={e => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          textAlignVertical={rest.multiline ? 'top' : 'center'}
          style={[
            styles.input,
            rest.multiline && styles.inputMulti,
            isRTL && styles.rtlText,
            style,
          ]}
        />
      )}
    </View>
  );
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{t(label)}</Text> : null}
      {onPress ? <Pressable onPress={onPress}>{box}</Pressable> : box}
    </View>
  );
}

export function OtpInput({
  value,
  onChange,
  length = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
}) {
  const ref = useRef<React.ComponentRef<typeof TextInput>>(null);
  const digits = value.split('');
  return (
    <Pressable onPress={() => ref.current?.focus()} style={styles.otpRow}>
      {Array.from({ length }).map((_, i) => {
        const active = i === Math.min(value.length, length - 1);
        return (
          <View key={i} style={[styles.otpBox, active && styles.otpActive]}>
            <Text style={styles.otpDigit}>{digits[i] ?? ''}</Text>
          </View>
        );
      })}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={v => onChange(v.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        style={styles.otpHidden}
        caretHidden
      />
    </Pressable>
  );
}

export function Segmented({
  options,
  value,
  onChange,
  style,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useI18n();
  return (
    <View style={[styles.segment, style]}>
      {options.map(o => {
        const active = o === value;
        return (
          <Pressable
            key={o}
            onPress={() => onChange(o)}
            style={[styles.segItem, active && styles.segActive]}
          >
            <Text
              style={[styles.segText, active && styles.segTextActive]}
              numberOfLines={1}
            >
              {t(o)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chips({
  options,
  value,
  onChange,
  style,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useI18n();
  return (
    <View style={[styles.chips, style]}>
      {options.map(o => {
        const active = o === value;
        return (
          <Pressable
            key={o}
            onPress={() => onChange(o)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {t(o)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      hitSlop={8}
      style={[styles.toggle, value && styles.toggleOn]}
    >
      <View style={[styles.knob, value && styles.knobOn]} />
    </Pressable>
  );
}

export function StatTile({
  value,
  label,
  sub,
  active,
  valueStyle,
  onPress,
  style,
}: {
  value: React.ReactNode;
  label: string;
  sub?: string;
  active?: boolean;
  valueStyle?: StyleProp<TextStyle>;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useI18n();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.stat, active && styles.statActive, style]}
    >
      <Text style={[styles.statValue, valueStyle]}>{value}</Text>
      <Text style={[styles.statLabel, active && styles.statLabelActive]}>
        {t(label)}
      </Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </Pressable>
  );
}

// Small stat cards used side by side, label on top.
export function InfoTile({
  label,
  value,
  sub,
  valueStyle,
  onPress,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  valueStyle?: StyleProp<TextStyle>;
  onPress?: () => void;
}) {
  const { t } = useI18n();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.infoTile}>
      <Text style={styles.infoTileLabel}>{t(label)}</Text>
      <Text style={[styles.infoTileValue, valueStyle]}>{value}</Text>
      {sub ? <Text style={styles.infoTileSub}>{sub}</Text> : null}
    </Pressable>
  );
}

// Big orange card with a soft circle, used for dues, results and salary.
export function HeroCard({
  label,
  value,
  children,
  onPress,
  style,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.hero, style]}>
      <View style={styles.heroCircle} />
      <Text style={styles.heroLabel}>{label}</Text>
      <Text style={styles.heroValue}>{value}</Text>
      {children}
    </Pressable>
  );
}

export function HeroPill({ label }: { label: string }) {
  return (
    <View style={styles.heroPill}>
      <Text style={styles.heroPillText}>{label}</Text>
    </View>
  );
}

export function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map(n => {
        const on = n <= value;
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={[styles.star, on && styles.starOn]}
          >
            <Star size={18} color={colors.text} strokeWidth={1.8} />
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.progress}>
      <View
        style={[styles.progressFill, { width: `${Math.min(100, value)}%` }]}
      />
    </View>
  );
}

// Striped box standing in for a photo, map or attachment.
export function Placeholder({
  label,
  height = 90,
  icon: Icon,
  style,
}: {
  label?: string;
  height?: number;
  icon?: IconType;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.placeholder, { height }, style]}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern
            id="stripes"
            width="14"
            height="14"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <Rect width="14" height="14" fill="#F4ECE6" />
            <Line x1="0" y1="0" x2="0" y2="14" stroke="#EADDD3" strokeWidth="7" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#stripes)" />
      </Svg>
      {Icon ? <Icon size={20} color={colors.textMuted} /> : null}
      {label ? <Text style={styles.placeholderText}>{label}</Text> : null}
    </View>
  );
}

// Deterministic QR-looking pattern (demo only, not scannable).
export function QRCode({ value, size = 112 }: { value: string; size?: number }) {
  const n = 25;
  const cell = size / n;
  const cells = useMemo(() => {
    /* eslint-disable no-bitwise -- tiny seeded PRNG for the fake QR */
    let seed = 0;
    for (let i = 0; i < value.length; i++) {
      seed = (seed * 31 + value.charCodeAt(i)) >>> 0;
    }
    const rand = () => {
      seed = (seed * 1103515245 + 12345) >>> 0;
      return (seed >>> 16) & 1;
    };
    /* eslint-enable no-bitwise */
    const out: Array<[number, number]> = [];
    const inFinder = (x: number, y: number) =>
      (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (!inFinder(x, y) && rand()) {
          out.push([x, y]);
        }
      }
    }
    return out;
  }, [value]);
  const finder = (x: number, y: number) => (
    <React.Fragment key={`f${x}-${y}`}>
      <Rect x={x * cell} y={y * cell} width={7 * cell} height={7 * cell} fill="#000" />
      <Rect x={(x + 1) * cell} y={(y + 1) * cell} width={5 * cell} height={5 * cell} fill="#fff" />
      <Rect x={(x + 2) * cell} y={(y + 2) * cell} width={3 * cell} height={3 * cell} fill="#000" />
    </React.Fragment>
  );
  return (
    <Svg width={size} height={size}>
      <Rect width={size} height={size} fill="#fff" />
      {cells.map(([x, y]) => (
        <Rect
          key={`${x}-${y}`}
          x={x * cell}
          y={y * cell}
          width={cell + 0.3}
          height={cell + 0.3}
          fill="#000"
        />
      ))}
      {finder(0, 0)}
      {finder(n - 7, 0)}
      {finder(0, n - 7)}
    </Svg>
  );
}

// ---------- Calendar & timetable ----------

export type DayStatus = 'present' | 'absent' | 'late' | 'leave' | 'holiday';

const dayTone: Record<DayStatus, { bg: string; fg: string }> = {
  present: { bg: colors.successSoft, fg: colors.success },
  absent: { bg: colors.dangerSoft, fg: colors.danger },
  late: { bg: colors.warnSoft, fg: colors.warn },
  leave: { bg: colors.infoSoft, fg: colors.info },
  holiday: { bg: colors.neutralSoft, fg: colors.textFaint },
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function MonthCalendar({
  year,
  month,
  marks,
  selected,
  onPrev,
  onNext,
}: {
  year: number;
  month: number; // 0-11
  marks: Record<number, DayStatus>;
  selected?: number;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const { t, isRTL } = useI18n();
  const first = new Date(year, month, 1).getDay(); // 0 = Sunday
  const offset = (first + 6) % 7; // Monday first
  const days = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  while (cells.length % 7) {
    cells.push(null);
  }
  const weeks: Array<Array<number | null>> = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  const Prev = isRTL ? ChevronRight : ChevronLeft;
  const Next = isRTL ? ChevronLeft : ChevronRight;
  return (
    <View>
      <View style={styles.calHead}>
        <Pressable onPress={onPrev} hitSlop={10}>
          <Prev size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.calTitle}>
          {MONTHS[month]} {year}
        </Text>
        <Pressable onPress={onNext} hitSlop={10}>
          <Next size={20} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.calRow}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Text key={i} style={styles.calDow}>
            {d}
          </Text>
        ))}
      </View>
      {weeks.map((w, wi) => (
        <View key={wi} style={styles.calRow}>
          {w.map((d, di) => {
            if (!d) {
              return <View key={di} style={styles.calCell} />;
            }
            const st = marks[d];
            const tone = st ? dayTone[st] : undefined;
            return (
              <View
                key={di}
                style={[
                  styles.calCell,
                  styles.calDay,
                  tone && { backgroundColor: tone.bg },
                  selected === d && styles.calSelected,
                ]}
              >
                <Text style={[styles.calDayText, tone && { color: tone.fg }]}>
                  {d}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
      <View style={styles.legend}>
        {(['present', 'absent', 'late', 'leave', 'holiday'] as DayStatus[]).map(
          s => (
            <View
              key={s}
              style={[styles.legendItem, { backgroundColor: dayTone[s].bg }]}
            >
              <Text style={[styles.legendText, { color: dayTone[s].fg }]}>
                {t(s[0].toUpperCase() + s.slice(1))}
              </Text>
            </View>
          ),
        )}
      </View>
    </View>
  );
}

export type TimetableCell = { top: string; bottom?: string; free?: boolean };

export function TimetableGrid({
  days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  times,
  rows,
  breakAfter,
  breakLabel = 'Break',
  highlight,
  filled,
}: {
  days?: string[];
  times: string[];
  rows: TimetableCell[][]; // rows[timeIndex][dayIndex]
  breakAfter?: number; // index of the time row after which the break is shown
  breakLabel?: string;
  highlight?: [number, number];
  filled?: boolean; // teacher view: busy periods filled orange
}) {
  return (
    <View>
      <View style={styles.ttRow}>
        <View style={styles.ttTime} />
        {days.map(d => (
          <Text key={d} style={styles.ttDay}>
            {d}
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <React.Fragment key={ri}>
          <View style={styles.ttRow}>
            <Text style={styles.ttTimeText}>{times[ri]}</Text>
            {row.map((c, ci) => {
              const hl = highlight && highlight[0] === ri && highlight[1] === ci;
              const busy = filled && !c.free;
              const orange = hl || busy;
              return (
                <View
                  key={ci}
                  style={[styles.ttCell, orange && styles.ttCellOn]}
                >
                  <Text
                    style={[
                      styles.ttCellText,
                      c.free && styles.ttFree,
                      orange && styles.ttCellTextOn,
                    ]}
                    numberOfLines={1}
                  >
                    {c.top}
                  </Text>
                  {c.bottom ? (
                    <Text
                      style={[styles.ttCellSub, orange && styles.ttCellSubOn]}
                      numberOfLines={1}
                    >
                      {c.bottom}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
          {breakAfter === ri ? (
            <View style={styles.ttRow}>
              <Text style={styles.ttTimeText}>BR</Text>
              <View style={styles.ttBreak}>
                <Text style={styles.ttBreakText}>{breakLabel}</Text>
              </View>
            </View>
          ) : null}
        </React.Fragment>
      ))}
    </View>
  );
}

// Attendance P / A / L / LV selector for one student.
export type Mark = 'P' | 'A' | 'L' | 'LV';

export function MarkSelector({
  value,
  onChange,
}: {
  value: Mark;
  onChange: (m: Mark) => void;
}) {
  const tone: Record<Mark, { bg: string; fg: string }> = {
    P: { bg: colors.successSoft, fg: colors.success },
    A: { bg: colors.dangerSoft, fg: colors.danger },
    L: { bg: colors.warnSoft, fg: colors.warn },
    LV: { bg: colors.infoSoft, fg: colors.info },
  };
  return (
    <View style={styles.marks}>
      {(['P', 'A', 'L', 'LV'] as Mark[]).map(m => {
        const on = m === value;
        return (
          <Pressable
            key={m}
            onPress={() => onChange(m)}
            hitSlop={3}
            style={[
              styles.markBtn,
              on && { backgroundColor: tone[m].bg, borderColor: tone[m].fg },
            ]}
          >
            <Text style={[styles.markText, on && { color: tone[m].fg }]}>
              {m}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Chat bubble used in complaints.
export function Bubble({
  mine,
  who,
  text,
}: {
  mine?: boolean;
  who: string;
  text: string;
}) {
  return (
    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
      <Text style={styles.bubbleWho}>{who}</Text>
      <Text style={styles.bubbleText}>{text}</Text>
    </View>
  );
}

// ---------- Styles ----------

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.5 },
  rtlText: { textAlign: 'right' },

  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  muted: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },

  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 12,
  },
  backBtn: {},
  screenTitle: { fontSize: 21, fontWeight: '800', color: colors.text },
  screenSubtitle: { fontSize: 12.5, color: colors.textMuted, marginTop: 1 },
  content: { paddingHorizontal: 14, paddingTop: 4, gap: 12 },
  contentNoScroll: { paddingHorizontal: 14, paddingTop: 4 },
  footer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: colors.bg,
    gap: 10,
  },

  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeDotText: { color: colors.text, fontSize: 10, fontWeight: '800' },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPadded: { paddingHorizontal: 14, paddingVertical: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 14.5, fontWeight: '800', color: colors.text },
  cardAction: { fontSize: 13, fontWeight: '700', color: colors.primaryText },

  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hstack: { flexDirection: 'row', alignItems: 'stretch' },

  iconTile: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 12,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  badge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '800' },

  avatar: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: { borderWidth: 3, borderColor: '#FFF3EA' },
  avatarText: { color: colors.primaryText, fontWeight: '800' },

  amount: { fontSize: 14, fontWeight: '800', color: colors.text },

  banner: {
    flexDirection: 'row',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  bannerIcon: { marginTop: 2 },
  bannerText: { flex: 1, fontSize: 12.5, fontWeight: '700', lineHeight: 18 },

  btn: {
    height: 48,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnOutline: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  btnText: { fontSize: 15, fontWeight: '800' },

  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 12.5, fontWeight: '800', color: colors.text },
  field: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  fieldMulti: { alignItems: 'flex-start', paddingVertical: 4 },
  fieldFocused: { borderColor: colors.primary },
  prefix: { fontSize: 15, fontWeight: '800', color: colors.text },
  input: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 10 },
  inputText: { paddingVertical: 13 },
  inputMulti: { minHeight: 84 },

  otpRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  otpBox: {
    width: 46,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpActive: { borderColor: colors.primary },
  otpDigit: { fontSize: 22, fontWeight: '800', color: colors.text },
  otpHidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },

  segment: {
    flexDirection: 'row',
    backgroundColor: colors.neutralSoft,
    borderRadius: radius.md,
    padding: 3,
  },
  segItem: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  segActive: {
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  segTextActive: { color: colors.text, fontWeight: '800' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.text },
  chipTextActive: { color: colors.text, fontWeight: '800' },

  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#D8D2CC',
    padding: 3,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: colors.primary },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  knobOn: { alignSelf: 'flex-end' },

  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 9,
    alignItems: 'center',
  },
  statActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statValue: { fontSize: 17, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  statLabelActive: { color: colors.text },
  statSub: { fontSize: 10.5, color: colors.textMuted },

  infoTile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  infoTileLabel: { fontSize: 11.5, fontWeight: '600', color: colors.textMuted },
  infoTileValue: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  infoTileSub: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },

  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: 15,
    overflow: 'hidden',
  },
  heroCircle: {
    position: 'absolute',
    right: -30,
    top: -10,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroLabel: { fontSize: 12, fontWeight: '700', color: colors.text },
  heroValue: { fontSize: 28, fontWeight: '900', color: colors.text },
  heroPill: {
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  heroPillText: { fontSize: 11, fontWeight: '800', color: colors.text },

  stars: { flexDirection: 'row', justifyContent: 'space-between' },
  star: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starOn: { backgroundColor: colors.primary, borderColor: colors.primary },

  progress: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutralSoft,
    overflow: 'hidden',
  },
  progressFill: { height: 8, backgroundColor: colors.primary },

  placeholder: {
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  placeholderText: { fontSize: 12.5, fontWeight: '700', color: colors.textMuted },

  calHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  calRow: { flexDirection: 'row', gap: 5, marginBottom: 5 },
  calDow: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textMuted,
  },
  calCell: { flex: 1, aspectRatio: 1.05 },
  calDay: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calSelected: { borderWidth: 2, borderColor: colors.text },
  calDayText: { fontSize: 12.5, fontWeight: '800', color: colors.text },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  legendItem: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  legendText: { fontSize: 11, fontWeight: '800' },

  ttRow: { flexDirection: 'row', gap: 4, marginBottom: 4, alignItems: 'center' },
  ttTime: { width: 38 },
  ttDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  ttTimeText: {
    width: 38,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  ttCell: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ttCellOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  ttCellText: { fontSize: 11.5, fontWeight: '800', color: colors.text },
  ttCellTextOn: { color: colors.text },
  ttCellSub: { fontSize: 9.5, color: colors.textMuted },
  ttCellSubOn: { color: '#5A2A08' },
  ttFree: { color: colors.textFaint, fontWeight: '600' },
  ttBreak: {
    flex: 1,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.neutralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ttBreakText: { fontSize: 10.5, fontWeight: '700', color: colors.textMuted },

  marks: { flexDirection: 'row', gap: 5 },
  markBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { fontSize: 11, fontWeight: '800', color: colors.textFaint },

  bubble: { maxWidth: '84%', borderRadius: 12, padding: 11, gap: 3 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.warnSoft },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: colors.neutralSoft },
  bubbleWho: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
  bubbleText: { fontSize: 13.5, color: colors.text, lineHeight: 19 },
});
