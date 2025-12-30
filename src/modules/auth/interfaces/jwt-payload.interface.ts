export interface JwtPayload {
  userId: number;
  role: string;
  iat?: number;
  exp?: number;
}

