import { ScreenMap } from '../../../navigation';
import { AdminMessagesLive } from './live';
import { notAvailableScreen as na } from '../accounts/live-kit';

// The messages screen shows server data; delivery log, templates, scheduling
// and SMS credit have no API yet and say so plainly.
export const adminMessagesScreens: ScreenMap = {
  AdminMessages: AdminMessagesLive,
  AdminMessageLog: na('Delivery log', 'Delivery log with retries'),
  AdminMessageTemplates: na('Templates', 'English and Urdu message templates'),
  AdminMessagesTools: na('Templates & scheduling', 'Templates, scheduling and SMS credit'),
};
