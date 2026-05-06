import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { writeFile } from 'fs/promises';
import { join, basename, extname } from 'path';
import * as https from 'https';
import * as fs from 'fs';
import FormData = require('form-data');

@Injectable()
export class BgRemovalService {
    private readonly logger = new Logger(BgRemovalService.name);
    private readonly apiKey: string | null;

    constructor(private readonly configService: ConfigService) {
        this.apiKey = this.configService.get<string>('REMOVEBG_API_KEY') ?? null;
    }

    get isEnabled(): boolean {
        return !!this.apiKey;
    }

    /**
     * Removes background from imagePath (local file), saves a new PNG beside it,
     * returns the relative URL like /uploads/uuid-nobg.png
     * Returns null if the API is not configured or fails.
     */
    async removeBackground(imagePath: string): Promise<string | null> {
        if (!this.apiKey) {
            this.logger.warn('REMOVEBG_API_KEY not set — skipping background removal');
            return null;
        }

        try {
            const ext = extname(imagePath);
            const base = basename(imagePath, ext);
            const noBgFilename = `${base}-nobg.png`;
            const noBgPath = join(process.cwd(), 'uploads', noBgFilename);

            const imageBuffer = fs.readFileSync(imagePath);
            const resultBuffer = await this.callRemoveBgApi(imageBuffer, basename(imagePath));

            await writeFile(noBgPath, resultBuffer);

            return `/uploads/${noBgFilename}`;
        } catch (err) {
            this.logger.error('Background removal failed', err instanceof Error ? err.message : err);
            return null;
        }
    }

    private callRemoveBgApi(imageBuffer: Buffer, filename: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const form = new FormData();
            form.append('image_file', imageBuffer, { filename, contentType: 'image/jpeg' });
            form.append('size', 'auto');

            const headers = {
                ...form.getHeaders(),
                'X-Api-Key': this.apiKey!,
            };

            const options = {
                method: 'POST',
                hostname: 'api.remove.bg',
                path: '/v1.0/removebg',
                headers,
            };

            const req = https.request(options, (res) => {
                const chunks: Buffer[] = [];
                res.on('data', (chunk: Buffer) => chunks.push(chunk));
                res.on('end', () => {
                    const body = Buffer.concat(chunks);
                    if (res.statusCode !== 200) {
                        reject(new Error(`remove.bg ${res.statusCode}: ${body.toString()}`));
                        return;
                    }
                    resolve(body);
                });
            });

            req.on('error', reject);
            form.pipe(req);
        });
    }
}
