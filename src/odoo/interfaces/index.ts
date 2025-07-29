export interface OdooConfig {
  url: string;
  database: string;
  username: string;
  password: string;
}

export interface SearchDomain {
  field: string;
  operator:
    | '='
    | '!='
    | '>'
    | '<'
    | '>='
    | '<='
    | 'like'
    | 'ilike'
    | 'in'
    | 'not in';
  value: any;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  order?: string;
}

export interface ReadOptions {
  fields?: string[];
}

export * from './odoo-client.interface';
