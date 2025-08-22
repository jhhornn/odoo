import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ProductService } from './product.service';
import {
  CreateProductDto,
  UpdateProductDto,
  FilterProductDto,
  ProductDto,
} from './dtos';
import { SearchDomain } from 'src/odoo/interfaces';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiOperation({ summary: 'Create a product' })
  @ApiResponse({
    status: 201,
    description: 'Product created',
    schema: { example: 101 },
  })
  @ApiBody({ type: CreateProductDto })
  async create(@Body() dto: CreateProductDto): Promise<number> {
    return this.productService.createProduct(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List products' })
  @ApiResponse({
    status: 200,
    description: 'List of products',
    type: [ProductDto],
  })
  async findAll(@Query() filters: FilterProductDto) {
    const domain: SearchDomain[] = [];
    if (filters.name) {
      domain.push({ field: 'name', operator: 'ilike', value: filters.name });
    }
    if (filters.default_code) {
      domain.push({
        field: 'default_code',
        operator: '=',
        value: filters.default_code,
      });
    }

    return this.productService.searchRead(domain, {
      fields: filters.fields,
      limit: filters.limit ? Number(filters.limit) : 50,
      offset: filters.offset ? Number(filters.offset) : 0,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiParam({ name: 'id', example: 101 })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const product = await this.productService.findOne(id);
    if (!product) {
      throw new BadRequestException(`Product with ID ${id} not found`);
    }
    return product;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a product' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.updateProduct(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.productService.deleteProduct(id);
  }
}
