import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

// turns common prisma errors into normal http errors instead of 500
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(err: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong';

    if (err.code === 'P2002') {
      status = HttpStatus.CONFLICT;
      const field = (err.meta?.target as string[] | undefined)?.join(', ');
      message = field ? `${field} already exists` : 'Record already exists';
    } else if (err.code === 'P2025') {
      status = HttpStatus.NOT_FOUND;
      message = 'Record not found';
    } else if (err.code === 'P2003') {
      status = HttpStatus.CONFLICT;
      message = 'This record is used by other records';
    }

    res.status(status).json({ statusCode: status, message });
  }
}
