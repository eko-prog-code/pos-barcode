export interface Product {
  id: string;
  name: string;
  regularPrice: number;
  stock: number;
  image: string;
  barcode: string; 
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Sale {
  id?: string;
  date: string;
  items: CartItem[];
  total: number;
  amountPaid: number;
  change: number;
  buyerName: string;
  whatsappNumber: string;
}