import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { DashboardController } from './dashboard.controller';

@Module({ imports: [ProductsModule], controllers: [DashboardController] })
export class DashboardModule {}
