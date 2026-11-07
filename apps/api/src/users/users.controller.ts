import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { CurrentUser, JwtUser, Roles } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

class UpdateRoleDto {
  @IsEnum(Role)
  role: Role;
}

const userSelect = { id: true, name: true, email: true, role: true, createdAt: true };

@ApiTags('users')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  findAll() {
    return this.prisma.user.findMany({ select: userSelect, orderBy: { id: 'asc' } });
  }

  @Patch(':id/role')
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() me: JwtUser,
  ) {
    // so the admin doesn't lock themselves out by mistake
    if (id === me.id) throw new BadRequestException("You can't change your own role");
    return this.prisma.user.update({ where: { id }, data: { role: dto.role }, select: userSelect });
  }
}
