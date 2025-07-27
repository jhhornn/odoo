import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { OdooService } from './odoo.service';
import {
  SearchDto,
  SearchReadDto,
  CreateRecordDto,
  UpdateRecordDto,
} from './dto';

@ApiTags('Odoo API')
@Controller('odoo')
export class OdooController {
  constructor(private readonly odooService: OdooService) {}

  @Get(':model/fields')
  @ApiOperation({
    summary: 'Get model fields information',
    description:
      'Retrieve metadata about fields for any Odoo model including field types, labels, and help text',
  })
  @ApiParam({
    name: 'model',
    description:
      'Odoo model name (e.g., res.partner, account.move, product.product)',
    example: 'res.partner',
  })
  @ApiQuery({
    name: 'attributes',
    required: false,
    type: [String],
    description: 'Field attributes to retrieve',
    example: ['string', 'help', 'type'],
  })
  @ApiResponse({
    status: 200,
    description: 'Model fields information',
    schema: {
      example: {
        name: { string: 'Name', type: 'char', help: 'The name of the partner' },
        email: { string: 'Email', type: 'char' },
      },
    },
  })
  async getModelFields(
    @Param('model') model: string,
    @Query('attributes') attributes?: string[],
  ) {
    try {
      const attributesList = attributes || ['string', 'help', 'type'];
      return await this.odooService.fieldsGet(model, attributesList);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':model/search')
  @ApiOperation({
    summary: 'Search for record IDs',
    description:
      'Search for records matching the given domain and return their IDs',
  })
  @ApiParam({
    name: 'model',
    description: 'Odoo model name',
    example: 'res.partner',
  })
  @ApiBody({
    type: SearchDto,
    description: 'Search criteria',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of record IDs',
    schema: {
      example: [7, 14, 23, 45],
    },
  })
  async searchRecords(
    @Param('model') model: string,
    @Body() searchDto: SearchDto,
  ) {
    try {
      return await this.odooService.search(model, searchDto.domain || [], {
        limit: searchDto.limit,
        offset: searchDto.offset,
        order: searchDto.order,
      });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':model/search-read')
  @ApiOperation({
    summary: 'Search and read records in one call',
    description:
      'Search for records and return their data in a single operation',
  })
  @ApiParam({
    name: 'model',
    description: 'Odoo model name',
    example: 'res.partner',
  })
  @ApiBody({
    type: SearchReadDto,
    description: 'Search criteria and fields to retrieve',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of record objects',
    schema: {
      example: [
        { id: 7, name: 'Azure Interior', email: 'azure@example.com' },
        { id: 14, name: 'Deco Addict', email: 'deco@example.com' },
      ],
    },
  })
  async searchReadRecords(
    @Param('model') model: string,
    @Body() searchReadDto: SearchReadDto,
  ) {
    try {
      return await this.odooService.searchRead(
        model,
        searchReadDto.domain || [],
        {
          limit: searchReadDto.limit,
          offset: searchReadDto.offset,
          order: searchReadDto.order,
          fields: searchReadDto.fields,
        },
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':model/:ids')
  @ApiOperation({
    summary: 'Read records by IDs',
    description: 'Retrieve specific records by their IDs',
  })
  @ApiParam({
    name: 'model',
    description: 'Odoo model name',
    example: 'res.partner',
  })
  @ApiParam({
    name: 'ids',
    description: 'Comma-separated list of record IDs',
    example: '7,14,23',
  })
  @ApiQuery({
    name: 'fields',
    required: false,
    type: [String],
    description: 'Fields to retrieve',
    example: ['name', 'email', 'phone'],
  })
  @ApiResponse({
    status: 200,
    description: 'Array of record objects',
    schema: {
      example: [{ id: 7, name: 'Azure Interior', email: 'azure@example.com' }],
    },
  })
  async readRecords(
    @Param('model') model: string,
    @Param('ids') idsParam: string,
    @Query('fields') fields?: string[],
  ) {
    try {
      const ids = idsParam.split(',').map((id) => parseInt(id.trim()));
      return await this.odooService.read(model, ids, { fields });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':model')
  @ApiOperation({
    summary: 'Create a new record',
    description: 'Create a new record in the specified model',
  })
  @ApiParam({
    name: 'model',
    description: 'Odoo model name',
    example: 'res.partner',
  })
  @ApiBody({
    type: CreateRecordDto,
    description: 'Record data to create',
  })
  @ApiResponse({
    status: 201,
    description: 'ID of the created record',
    schema: {
      example: 156,
    },
  })
  async createRecord(
    @Param('model') model: string,
    @Body() createDto: CreateRecordDto,
  ) {
    try {
      return await this.odooService.create(model, createDto.values);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Put(':model/:ids')
  @ApiOperation({
    summary: 'Update existing records',
    description: 'Update one or more existing records with new values',
  })
  @ApiParam({
    name: 'model',
    description: 'Odoo model name',
    example: 'res.partner',
  })
  @ApiParam({
    name: 'ids',
    description: 'Comma-separated list of record IDs to update',
    example: '7,14',
  })
  @ApiBody({
    type: UpdateRecordDto,
    description: 'Fields to update',
  })
  @ApiResponse({
    status: 200,
    description: 'Success status',
    schema: {
      example: true,
    },
  })
  async updateRecords(
    @Param('model') model: string,
    @Param('ids') idsParam: string,
    @Body() updateDto: UpdateRecordDto,
  ) {
    try {
      const ids = idsParam.split(',').map((id) => parseInt(id.trim()));
      return await this.odooService.write(model, ids, updateDto.values);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':model/:ids')
  @ApiOperation({
    summary: 'Delete records',
    description: 'Delete one or more records by their IDs',
  })
  @ApiParam({
    name: 'model',
    description: 'Odoo model name',
    example: 'res.partner',
  })
  @ApiParam({
    name: 'ids',
    description: 'Comma-separated list of record IDs to delete',
    example: '156,157',
  })
  @ApiResponse({
    status: 200,
    description: 'Success status',
    schema: {
      example: true,
    },
  })
  async deleteRecords(
    @Param('model') model: string,
    @Param('ids') idsParam: string,
  ) {
    try {
      const ids = idsParam.split(',').map((id) => parseInt(id.trim()));
      return await this.odooService.unlink(model, ids);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get(':model/name-search')
  @ApiOperation({
    summary: 'Search records by name',
    description: 'Search for records using name matching',
  })
  @ApiParam({
    name: 'model',
    description: 'Odoo model name',
    example: 'res.partner',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Name to search for',
    example: 'Azure',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of results',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Array of [id, name] pairs',
    schema: {
      example: [
        [7, 'Azure Interior'],
        [14, 'Azure Solutions'],
      ],
    },
  })
  async nameSearch(
    @Param('model') model: string,
    @Query('name') name?: string,
    @Query('limit') limit?: number,
  ) {
    try {
      return await this.odooService.nameSearch(model, name || '', { limit });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':model/count')
  @ApiOperation({
    summary: 'Count records matching domain',
    description:
      'Count the number of records that match the given search criteria',
  })
  @ApiParam({
    name: 'model',
    description: 'Odoo model name',
    example: 'res.partner',
  })
  @ApiBody({
    type: SearchDto,
    description: 'Search criteria',
  })
  @ApiResponse({
    status: 200,
    description: 'Number of matching records',
    schema: {
      example: 42,
    },
  })
  async countRecords(
    @Param('model') model: string,
    @Body() searchDto: SearchDto,
  ) {
    try {
      return await this.odooService.searchCount(model, searchDto.domain || []);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
