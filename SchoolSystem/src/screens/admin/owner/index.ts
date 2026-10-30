import { ScreenMap } from '../../../navigation';
import { AdminCampusDetail, AdminCampuses, AdminCampusTransfers } from './campuses';
import { AdminRoleEditor, AdminRoles, AdminUsersRoles } from './users';
import {
  AdminIntegrationDetail,
  AdminIntegrations,
  AdminSettings,
  AdminTemplateEdit,
  AdminTemplates,
} from './settings';
import { AdminAuditLog, AdminBackup } from './system';

export const adminOwnerScreens: ScreenMap = {
  AdminCampuses,
  AdminCampusDetail,
  AdminCampusTransfers,
  AdminUsersRoles,
  AdminRoles,
  AdminRoleEditor,
  AdminSettings,
  AdminTemplates,
  AdminTemplateEdit,
  AdminIntegrations,
  AdminIntegrationDetail,
  AdminAuditLog,
  AdminBackup,
};
