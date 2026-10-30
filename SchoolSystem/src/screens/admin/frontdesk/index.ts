import { ScreenMap } from '../../../navigation';
import {
  AdminAdmission,
  AdminEntryTest,
  AdminInquiries,
  AdminRegistration,
  AdminRegistrationForm,
  AdminRegistrationSlip,
} from './crm';
import {
  AdminCallLog,
  AdminCertificateIssue,
  AdminCertificateLog,
  AdminCertificates,
  AdminGatePass,
  AdminIdCards,
  AdminStudentProfile,
  AdminStudents,
  AdminVisitors,
} from './students';

export const adminFrontDeskScreens: ScreenMap = {
  AdminInquiries,
  AdminRegistration,
  AdminRegistrationForm,
  AdminRegistrationSlip,
  AdminEntryTest,
  AdminAdmission,
  AdminStudents,
  AdminStudentProfile,
  AdminCertificates,
  AdminCertificateIssue,
  AdminCertificateLog,
  AdminIdCards,
  AdminVisitors,
  AdminGatePass,
  AdminCallLog,
};
