import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiHeader,
  ApiSecurity,
} from '@nestjs/swagger';
import { ProductService } from './product.service';
import { FilterProductDto, ProductDto } from './dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpsertProductDto } from './dto/upsert-product.dto';
import { SearchDomain } from '../odoo/interfaces';
import { GetApiKeyContext } from '../auth/decorators';
import { ApiKeyContext } from '../auth/interfaces';
import { errRecordNotFound } from '../common/constants';
import { ApiStandardResponse } from '../common/decorators/api-response.decorator';
import { ApiCommonErrorResponses } from '../common/decorators/api-error-responses.decorator';

@ApiTags('Products')
@ApiSecurity('X-API-Key')
@ApiCommonErrorResponses()
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create or update a Plan or Product',
    description:
      'Creates or updates a plan/product in Odoo. Checks for existence by external_ref (stored as default_code) before creating.',
  })
  @ApiHeader({
    name: 'X-API-Key',
    description: 'External system API key',
    required: true,
  })
  @ApiBody({ type: UpsertProductDto })
  @ApiStandardResponse({
    status: 200,
    description: 'Product created or updated successfully',
  })
  async create(
    @Body() dto: UpsertProductDto,
    @GetApiKeyContext() context: ApiKeyContext,
  ) {
    return this.productService.upsert(dto, context);
  }

  @Get()
  @ApiOperation({ summary: 'List products' })
  @ApiStandardResponse({
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

  @Get('available')
  @ApiOperation({ summary: 'List products available for sale' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiStandardResponse({ status: 200, description: 'Available products' })
  async getAvailableProducts(@Query('limit') limit?: number) {
    return this.productService.findAvailableProducts(limit);
  }

  @Get('in-stock')
  @ApiOperation({ summary: 'List products currently in stock' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiStandardResponse({ status: 200, description: 'Products in stock' })
  async getInStockProducts(@Query('limit') limit?: number) {
    return this.productService.findInStock(limit);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'List products with low stock levels' })
  @ApiQuery({
    name: 'threshold',
    required: false,
    type: Number,
    description: 'Stock threshold (default: 5)',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiStandardResponse({ status: 200, description: 'Low stock products' })
  async getLowStockProducts(
    @Query('threshold') threshold?: number,
    @Query('limit') limit?: number,
  ) {
    return this.productService.findLowStock(threshold, limit);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search products by name or reference' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiStandardResponse({ status: 200, description: 'Search results' })
  async searchProducts(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    return this.productService.searchProducts(query, limit);
  }

  @Get('category/:categoryId')
  @ApiOperation({ summary: 'Get products by category' })
  @ApiParam({
    name: 'categoryId',
    type: Number,
    description: 'Product category ID',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiStandardResponse({ status: 200, description: 'Products in category' })
  async getProductsByCategory(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Query('limit') limit?: number,
  ) {
    return this.productService.findByCategory(categoryId, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Product ID',
    example: 101,
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Product details',
    type: ProductDto,
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const product = await this.productService.findOne(id);
    if (!product) {
      throw new BadRequestException(errRecordNotFound('Product', id));
    }
    return product;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', type: Number, description: 'Product ID' })
  @ApiBody({ type: UpdateProductDto })
  @ApiStandardResponse({
    status: 200,
    description: 'Product updated successfully',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.updateProduct(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam({ name: 'id', type: Number, description: 'Product ID' })
  @ApiStandardResponse({
    status: 204,
    description: 'Product deleted successfully',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.productService.deleteProduct(id);
  }

  @Put(':id/price')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update product price' })
  @ApiParam({ name: 'id', type: Number, description: 'Product ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        price: { type: 'number', example: 99.99 },
      },
      required: ['price'],
    },
  })
  @ApiStandardResponse({
    status: 200,
    description: 'Price updated successfully',
  })
  async updatePrice(
    @Param('id', ParseIntPipe) id: number,
    @Body('price') price: number,
  ) {
    return this.productService.updatePrice(id, price);
  }
}
