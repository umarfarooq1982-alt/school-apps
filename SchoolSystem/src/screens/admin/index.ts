import { ScreenMap } from '../../navigation';
import { adminCoreScreens } from './core';
import { adminReportScreens } from './reports';
import { adminOwnerScreens } from './owner';
import { adminPrincipalScreens } from './principal';
import { adminFrontDeskScreens } from './frontdesk';
import { adminExamScreens } from './exam';
import { adminAccountsScreens } from './accounts';
import { adminHrScreens } from './hr';
import { adminTransportScreens } from './transport';
import { adminStoreScreens } from './store';
import { adminMessagesScreens } from './messages';

export const adminScreens: ScreenMap = {
  ...adminCoreScreens,
  ...adminReportScreens,
  ...adminOwnerScreens,
  ...adminPrincipalScreens,
  ...adminFrontDeskScreens,
  ...adminExamScreens,
  ...adminAccountsScreens,
  ...adminHrScreens,
  ...adminTransportScreens,
  ...adminStoreScreens,
  ...adminMessagesScreens,
};
