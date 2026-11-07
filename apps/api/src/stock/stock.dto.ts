import { MovementType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '../common/pagination.dto';

export class CreateMovementDto {
  @IsEnum(MovementType)
  type: MovementType;

  @IsInt()
  productId: number;

  @IsInt()
  warehouseId: number;

  // for IN / OUT this is how many items, for ADJUST it's the real counted quantity
  @IsInt()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class TransferDto {
  @IsInt()
  productId: number;

  @IsInt()
  fromWarehouseId: number;

  @IsInt()
  toWarehouseId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class MovementQueryDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  warehouseId?: number;

  @IsOptional()
  @IsEnum(MovementType)
  type?: MovementType;
}
