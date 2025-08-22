import { BadRequestException, Injectable } from '@nestjs/common';
import { BaseOdooService } from '../odoo/services/base.service';
import { OdooService } from '../odoo/odoo.service';
import { PartnerService } from 'src/partner/partner.service';
import { ProductService } from 'src/product/product.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dtos';

@Injectable()
export class InvoiceService extends BaseOdooService {
  constructor(
    odooService: OdooService,
    private readonly partnerService: PartnerService,
    private readonly productService: ProductService,
  ) {
    super(odooService, 'account.move');
  }

  async createInvoice(dto: CreateInvoiceDto) {
    // Validate partner
    const partnerExists = await this.partnerService.exists(dto.partner_id);
    if (!partnerExists) {
      throw new BadRequestException(
        `Partner with ID ${dto.partner_id} does not exist`,
      );
    }

    // Validate products
    if (dto.invoice_line_ids) {
      for (const line of dto.invoice_line_ids) {
        const productId = line[2]?.product_id;
        if (productId) {
          const productExists = await this.productService.exists(productId);
          if (!productExists) {
            throw new BadRequestException(
              `Product with ID ${productId} does not exist`,
            );
          }
        }
      }
    }

    return this.create(dto);
  }

  async updateInvoice(id: number, dto: UpdateInvoiceDto) {
    const invoice = await this.findOne(id);
    if (!invoice) {
      throw new BadRequestException(`Invoice with ID ${id} not found`);
    }
    return this.update(id, dto);
  }

  async deleteInvoice(id: number) {
    const invoice = await this.findOne(id);
    if (!invoice) {
      throw new BadRequestException(`Invoice with ID ${id} not found`);
    }
    return this.delete(id);
  }
}
