import { ScreenMap } from '../../../navigation';
import { inventoryScreens } from './inventory';
import { libraryScreens } from './library';

export const adminStoreScreens: ScreenMap = {
  ...inventoryScreens,
  ...libraryScreens,
};
