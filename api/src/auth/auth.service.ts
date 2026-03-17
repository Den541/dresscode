import {
    BadRequestException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import type { StringValue } from 'ms';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async register(dto: RegisterDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });

        if (existingUser) {
            throw new BadRequestException('User with this email already exists');
        }

        const passwordHash = await argon2.hash(dto.password);

        const user = await this.prisma.user.create({
            data: {
                email: dto.email.toLowerCase(),
                name: dto.name,
                passwordHash,
                preferences: {
                    create: {},
                },
            },
        });

        const tokens = await this.issueTokens(user.id, user.email);
        await this.setRefreshTokenHash(user.id, tokens.refreshToken);

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
            ...tokens,
        };
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await argon2.verify(
            user.passwordHash,
            dto.password,
        );
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const tokens = await this.issueTokens(user.id, user.email);
        await this.setRefreshTokenHash(user.id, tokens.refreshToken);

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
            ...tokens,
        };
    }

    async refresh(dto: RefreshTokenDto) {
        const payload = await this.verifyRefreshToken(dto.refreshToken);

        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
        });

        if (!user || !user.refreshTokenHash) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const isTokenValid = await argon2.verify(
            user.refreshTokenHash,
            dto.refreshToken,
        );
        if (!isTokenValid) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const tokens = await this.issueTokens(user.id, user.email);
        await this.setRefreshTokenHash(user.id, tokens.refreshToken);

        return tokens;
    }

    async logout(userId: string) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshTokenHash: null },
        });

        return { success: true };
    }

    private async setRefreshTokenHash(userId: string, refreshToken: string) {
        const refreshTokenHash = await argon2.hash(refreshToken);

        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshTokenHash },
        });
    }

    private async issueTokens(userId: string, email: string) {
        const payload: JwtPayload = { sub: userId, email };

        const accessToken = await this.jwtService.signAsync(payload, {
            secret: this.getJwtSecret(),
            expiresIn: this.getAccessTokenTtl(),
        });

        const refreshToken = await this.jwtService.signAsync(payload, {
            secret: this.getRefreshSecret(),
            expiresIn: this.getRefreshTokenTtl(),
        });

        return { accessToken, refreshToken };
    }

    private async verifyRefreshToken(refreshToken: string): Promise<JwtPayload> {
        try {
            return await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
                secret: this.getRefreshSecret(),
            });
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    private getJwtSecret(): string {
        const secret = this.configService.get<string>('JWT_SECRET');
        if (!secret) {
            throw new Error('JWT_SECRET is not set');
        }
        return secret;
    }

    private getRefreshSecret(): string {
        return (
            this.configService.get<string>('JWT_REFRESH_SECRET') ??
            this.getJwtSecret()
        );
    }

    private getAccessTokenTtl(): StringValue {
        return (this.configService.get<string>('JWT_EXPIRES_IN') ??
            '15m') as StringValue;
    }

    private getRefreshTokenTtl(): StringValue {
        return (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ??
            '7d') as StringValue;
    }
}
