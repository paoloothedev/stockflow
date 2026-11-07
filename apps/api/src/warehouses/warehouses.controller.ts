import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, PartialType } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { Roles } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

class WarehouseDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  location?: string;
}

class UpdateWarehouseDto extends PartialType(WarehouseDto) {}

@ApiTags('warehouses')
@ApiBearerAuth()
@Controller('warehouses')
export class WarehousesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll() {
    const warehouses = await this.prisma.warehouse.findMany({
      orderBy: { id: 'asc' },
      include: { stock: { select: { quantity: true } } },
    });
    // send total items count instead of the whole stock list
    return warehouses.map(({ stock, ...w }) => ({
      ...w,
      totalItems: stock.reduce((sum, s) => sum + s.quantity, 0),
    }));
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.warehouse.findUniqueOrThrow({
      where: { id },
      include: {
        stock: {
          include: { product: { select: { id: true, sku: true, name: true, minStock: true } } },
          orderBy: { quantity: 'asc' },
        },
      },
    });
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: WarehouseDto) {
    return this.prisma.warehouse.create({ data: dto });
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateWarehouseDto) {
    return this.prisma.warehouse.update({ where: { id }, data: dto });
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.warehouse.delete({ where: { id } });
  }
}
