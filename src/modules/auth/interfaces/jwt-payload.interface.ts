import { UserRole } from '../../users/enums/user-role.enum';

export interface JwtPayload {
  sub: number;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface CurrentUser {
  userId: number;
  role: UserRole;
}
