import { ScreenMap } from '../../../navigation';
import { AdminApprovalDetail, AdminApprovals } from './approvals';
import {
  AdminAcadClasses,
  AdminAcadCopy,
  AdminAcademicSetup,
  AdminAcadMapping,
  AdminAcadSessions,
  AdminAcadSubjects,
  AdminAcadTerms,
} from './academic';
import { AdminSubHistory, AdminSubstitutions, AdminTimetableBuilder } from './timetable';
import { AdminCalendarManage } from './calendar';
import {
  AdminCurrCoverage,
  AdminCurriculum,
  AdminCurrPlanDetail,
  AdminCurrPlans,
  AdminCurrSyllabus,
} from './curriculum';
import {
  AdminPromoAlumni,
  AdminPromoLeaving,
  AdminPromotion,
  AdminPromoTransfer,
  AdminPromoWizard,
} from './promotion';
import {
  AdminComplaintDetail,
  AdminComplaints,
  AdminSurveyDetail,
  AdminSurveys,
} from './complaints';
import { AdminHealthDiscipline } from './health';

export const adminPrincipalScreens: ScreenMap = {
  AdminApprovals,
  AdminApprovalDetail,
  AdminAcademicSetup,
  AdminAcadSessions,
  AdminAcadCopy,
  AdminAcadClasses,
  AdminAcadSubjects,
  AdminAcadMapping,
  AdminAcadTerms,
  AdminTimetableBuilder,
  AdminSubstitutions,
  AdminSubHistory,
  AdminCalendarManage,
  AdminCurriculum,
  AdminCurrSyllabus,
  AdminCurrPlans,
  AdminCurrPlanDetail,
  AdminCurrCoverage,
  AdminPromotion,
  AdminPromoWizard,
  AdminPromoTransfer,
  AdminPromoLeaving,
  AdminPromoAlumni,
  AdminComplaints,
  AdminComplaintDetail,
  AdminSurveys,
  AdminSurveyDetail,
  AdminHealthDiscipline,
};
