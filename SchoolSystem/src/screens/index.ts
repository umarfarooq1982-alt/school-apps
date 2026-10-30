import { ScreenMap } from '../navigation';
import { authScreens } from './auth';
import { commonScreens } from './common';
import { sharedScreens } from './shared';
import { parentScreens } from './parent';
import { studentScreens } from './student';
import { teacherScreens } from './teacher';

export const screens: ScreenMap = {
  ...authScreens,
  ...commonScreens,
  ...sharedScreens,
  ...parentScreens,
  ...studentScreens,
  ...teacherScreens,
};
