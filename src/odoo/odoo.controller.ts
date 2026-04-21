import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiSecurity,
} from '@nestjs/swagger';
import { OdooService } from './odoo.service';
import {
  SearchReadDto,
  CreateRecordDto,
  UpdateRecordDto,
  SearchDto,
} from './dto';
import { ApiStandardResponse } from '../common/decorators/api-response.decorator';
import { ApiCommonErrorResponses } from '../common/decorators/api-error-responses.decorator';

@ApiTags('Odoo Generic')
@ApiSecurity('X-API-Key')
@ApiCommonErrorResponses()
@Controller('odoo')
export class OdooController {
  constructor(private readonly odooService: OdooService) {}

  @Post(':model/search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search records' })
  @ApiParam({ name: 'model', example: 'res.partner' })
  @ApiBody({ type: SearchDto })
  @ApiStandardResponse({
    status: 200,
    description: 'List of record IDs',
    type: [Number],
  })
  async search(
    @Param('model') model: string,
    @Body() searchDto: SearchDto,
  ): Promise<number[]> {
    return this.odooService.search(model, searchDto.domain, {
      limit: searchDto.limit,
      offset: searchDto.offset,
      order: searchDto.order,
    });
  }

  @Post(':model/search_read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search and read records' })
  @ApiParam({ name: 'model', example: 'res.partner' })
  @ApiBody({ type: SearchReadDto })
  @ApiStandardResponse({ status: 200, description: 'List of records' })
  async searchRead(
    @Param('model') model: string,
    @Body() searchReadDto: SearchReadDto,
  ): Promise<any[]> {
    return this.odooService.searchRead(model, searchReadDto.domain, {
      fields: searchReadDto.fields,
      limit: searchReadDto.limit,
      offset: searchReadDto.offset,
      order: searchReadDto.order,
    });
  }

  @Post(':model')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a record' })
  @ApiParam({ name: 'model', example: 'res.partner' })
  @ApiBody({ type: CreateRecordDto })
  @ApiStandardResponse({
    status: 201,
    description: 'Created record ID',
    type: Number,
  })
  async create(
    @Param('model') model: string,
    @Body() createRecordDto: CreateRecordDto,
  ): Promise<number> {
    return this.odooService.create(model, createRecordDto.values);
  }

  @Get(':model/fields')
  @ApiOperation({ summary: 'Get model fields metadata' })
  @ApiParam({ name: 'model', example: 'res.partner' })
  @ApiStandardResponse({ status: 200, description: 'Model fields metadata' })
  async fieldsGet(@Param('model') model: string): Promise<any> {
    return this.odooService.fieldsGet(model);
  }

  @Get(':model/name-search')
  @ApiOperation({ summary: 'Search by name pattern' })
  @ApiParam({ name: 'model', example: 'res.partner' })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiStandardResponse({ status: 200, description: 'Name search results' })
  async nameSearch(
    @Param('model') model: string,
    @Query('name') name?: string,
    @Query('limit') limit?: number,
  ) {
    return this.odooService.nameSearch(model, name || '', { limit });
  }

  @Get(':model/:id')
  @ApiOperation({ summary: 'Read a record' })
  @ApiParam({ name: 'model', example: 'res.partner' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiStandardResponse({ status: 200, description: 'Record details' })
  async read(
    @Param('model') model: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<any> {
    const results = await this.odooService.read(model, [id]);
    return results.length > 0 ? results[0] : null;
  }

  @Put(':model/:id')
  @ApiOperation({ summary: 'Update a record' })
  @ApiParam({ name: 'model', example: 'res.partner' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({ type: UpdateRecordDto })
  @ApiStandardResponse({
    status: 200,
    description: 'Record updated successfully',
    type: Boolean,
  })
  async write(
    @Param('model') model: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRecordDto: UpdateRecordDto,
  ): Promise<boolean> {
    return this.odooService.write(model, [id], updateRecordDto.values);
  }

  @Delete(':model/:id')
  @ApiOperation({ summary: 'Delete a record' })
  @ApiParam({ name: 'model', example: 'res.partner' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiStandardResponse({
    status: 200,
    description: 'Record deleted successfully',
    type: Boolean,
  })
  async unlink(
    @Param('model') model: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<boolean> {
    return this.odooService.unlink(model, [id]);
  }

  @Post(':model/search-count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Count records' })
  @ApiParam({ name: 'model', example: 'res.partner' })
  @ApiBody({ type: SearchDto })
  @ApiStandardResponse({
    status: 200,
    description: 'Count of records',
    type: Number,
  })
  async searchCount(
    @Param('model') model: string,
    @Body() searchDto: SearchDto,
  ): Promise<number> {
    return this.odooService.searchCount(model, searchDto.domain);
  }
}
