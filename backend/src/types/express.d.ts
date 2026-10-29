import { IUser } from '../models/User';
import { IHousehold } from '../models/Household';
import { HouseholdRole } from '../config/constants';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      household?: IHousehold;
      householdRole?: HouseholdRole;
    }
  }
}

export {};
