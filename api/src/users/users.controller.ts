import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me')
    getMe(@CurrentUser() user: AuthUser) {
        return this.usersService.getMe(user.userId);
    }

    @Patch('me')
    updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
        return this.usersService.updateMe(user.userId, dto);
    }
}
