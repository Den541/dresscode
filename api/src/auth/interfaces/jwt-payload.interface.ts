export interface JwtPayload {
    sub: string;
    email: string;
}

export interface AuthUser {
    userId: string;
    email: string;
}
