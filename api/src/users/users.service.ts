import { Injectable, NotFoundException } from '@nestjs/common';
import { Style } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async getMe(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                updatedAt: true,
                preferences: {
                    select: {
                        style: true,
                        coldSensitivity: true,
                        favoriteCats: true,
                    },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async updateMe(userId: string, dto: UpdateProfileDto) {
        const { name, style, coldSensitivity, favoriteCats } = dto;

        if (typeof name !== 'undefined') {
            await this.prisma.user.update({
                where: { id: userId },
                data: { name },
            });
        }

        if (
            typeof style !== 'undefined' ||
            typeof coldSensitivity !== 'undefined' ||
            typeof favoriteCats !== 'undefined'
        ) {
            await this.prisma.userPreferences.upsert({
                where: { userId },
                create: {
                    userId,
                    style: style ?? Style.CASUAL,
                    coldSensitivity: coldSensitivity ?? 0,
                    favoriteCats,
                },
                update: {
                    ...(typeof style !== 'undefined' ? { style } : {}),
                    ...(typeof coldSensitivity !== 'undefined'
                        ? { coldSensitivity }
                        : {}),
                    ...(typeof favoriteCats !== 'undefined' ? { favoriteCats } : {}),
                },
            });
        }

        return this.getMe(userId);
    }
}
