import { api } from './base';
import type { ApiResponse } from './types';
import type { VoucherProduct } from '../types/voucherProduct';

export const voucherProductsApi = {
    getActive: () => api.get<ApiResponse<VoucherProduct[]>>('/voucher-products/active')
};


