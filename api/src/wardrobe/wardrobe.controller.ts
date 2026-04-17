import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Body,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuid } from 'uuid';
import { join } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { WardrobeService } from './wardrobe.service';
import { CreateWardrobeDto } from './dto/create-wardrobe.dto';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOAD_DIR = join(process.cwd(), 'uploads');

@Controller('wardrobe')
@UseGuards(JwtAuthGuard)
export class WardrobeController {
    constructor(private wardrobeService: WardrobeService) { }

    @Post()
    @UseInterceptors(
        FileInterceptor('image', {
            storage: diskStorage({
                destination: UPLOAD_DIR,
                filename: (req, file, cb) => {
                    const ext = file.originalname.split('.').pop();
                    const filename = `${uuid()}.${ext}`;
                    cb(null, filename);
                },
            }),
            fileFilter: (req, file, cb) => {
                if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
                    return cb(
                        new BadRequestException(
                            'Only JPEG and PNG images are allowed',
                        ),
                        false,
                    );
                }
                cb(null, true);
            },
            limits: { fileSize: MAX_FILE_SIZE },
        }),
    )
    async uploadItem(
        @CurrentUser() user: any,
        @UploadedFile() file: Express.Multer.File,
        @Body() createWardrobeDto: CreateWardrobeDto,
    ) {
        if (!file) {
            throw new BadRequestException('Image file is required');
        }

        return this.wardrobeService.createItem(
            user.userId,
            createWardrobeDto,
            file.filename,
        );
    }

    @Get()
    async getItems(@CurrentUser() user: any) {
        return this.wardrobeService.getUserItems(user.userId);
    }

    @Delete(':id')
    async deleteItem(@Param('id') itemId: string, @CurrentUser() user: any) {
        const deletedItem = await this.wardrobeService.deleteItem(
            user.userId,
            itemId,
        );

        if (!deletedItem) {
            throw new NotFoundException('Wardrobe item not found');
        }

        return { message: 'Item deleted successfully' };
    }
}
