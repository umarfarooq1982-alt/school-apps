import { ScreenMap } from '../../../navigation';
import { messagesScreens as legacy } from './screens';
import { AdminMessagesLive } from './live';
import { sampleScreen } from '../accounts/live-kit';

// The contract route opens the server-backed screen; templates, scheduling
// and SMS credit stay on the sample "tools" screens.
export const adminMessagesScreens: ScreenMap = {
  AdminMessages: AdminMessagesLive,
  AdminMessageLog: sampleScreen(legacy.AdminMessageLog, 'delivery log with retries'),
  AdminMessageTemplates: sampleScreen(legacy.AdminMessageTemplates, 'English and Urdu templates'),
  AdminMessagesTools: sampleScreen(legacy.AdminMessages, 'templates, scheduling and SMS credit'),
};
