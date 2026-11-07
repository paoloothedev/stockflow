import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtUser } from '../common/decorators';
import { CreateMovementDto, MovementQueryDto, TransferDto } from './stock.dto';
import { StockService } from './stock.service';

@ApiTags('stock')
@ApiBearerAuth()
@Controller('stock')
export class StockController {
  constructor(private stock: StockService) {}

  @Get('movements')
  list(@Query() query: MovementQueryDto) {
    return this.stock.listMovements(query);
  }

  @Post('movements')
  create(@Body() dto: CreateMovementDto, @CurrentUser() user: JwtUser) {
    return this.stock.createMovement(dto, user.id);
  }

  @Post('transfer')
  transfer(@Body() dto: TransferDto, @CurrentUser() user: JwtUser) {
    return this.stock.transfer(dto, user.id);
  }
}
