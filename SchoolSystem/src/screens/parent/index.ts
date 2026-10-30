import { createElement } from 'react';
import { File, GraduationCap, House, LayoutGrid, Receipt } from 'lucide-react-native';
import { ScreenMap, ScreenProps } from '../../navigation';
import { TabDef, TabShell } from '../../components/Tabs';
import { ResultsScreen } from '../shared';
import { ParentDiaryTab, ParentHome } from './home';
import {
  ParentFee,
  ParentPaymentHistory,
  ParentPaymentStatus,
  ParentPayOnline,
  ParentVoucher,
} from './fee';
import { ParentMore, ParentSettings } from './more';
import { ParentBehavior, ParentChangeRequest, ParentProfile } from './profile';
import {
  ParentCertificates,
  ParentComplaints,
  ParentLeave,
  ParentNewComplaint,
  ParentPickup,
  ParentSurvey,
} from './forms';

const TABS: TabDef[] = [
  { key: 'home', label: 'Home', icon: House, component: ParentHome },
  { key: 'fee', label: 'Fee', icon: Receipt, component: ParentFee },
  { key: 'diary', label: 'Diary', icon: File, component: ParentDiaryTab },
  { key: 'results', label: 'Results', icon: GraduationCap, component: ResultsScreen },
  { key: 'more', label: 'More', icon: LayoutGrid, component: ParentMore },
];

function ParentTabs(_: ScreenProps) {
  return createElement(TabShell, { tabs: TABS });
}

export const parentScreens: ScreenMap = {
  ParentTabs,
  ParentVoucher,
  ParentPaymentHistory,
  ParentPayOnline,
  ParentPaymentStatus,
  ParentSettings,
  ParentProfile,
  ParentChangeRequest,
  ParentBehavior,
  ParentLeave,
  ParentComplaints,
  ParentNewComplaint,
  ParentSurvey,
  ParentPickup,
  ParentCertificates,
};
