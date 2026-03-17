import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ErrorResponseBody = {
    statusCode: number;
    message: string | string[];
    error?: string;
    timestamp: string;
    path: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): void {
        const context = host.switchToHttp();
        const response = context.getResponse<Response>();
        const request = context.getRequest<Request>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const body = this.buildErrorBody(exception, status, request.url);

        response.status(status).json(body);
    }

    private buildErrorBody(
        exception: unknown,
        status: number,
        path: string,
    ): ErrorResponseBody {
        if (exception instanceof HttpException) {
            const payload = exception.getResponse();

            if (typeof payload === 'string') {
                return {
                    statusCode: status,
                    message: payload,
                    timestamp: new Date().toISOString(),
                    path,
                };
            }

            const data = payload as {
                message?: string | string[];
                error?: string;
            };

            return {
                statusCode: status,
                message: data.message ?? exception.message,
                error: data.error,
                timestamp: new Date().toISOString(),
                path,
            };
        }

        return {
            statusCode: status,
            message: 'Internal server error',
            timestamp: new Date().toISOString(),
            path,
        };
    }
}
