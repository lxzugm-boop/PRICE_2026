
export interface PriceItem {
  id: string;
  article: string;
  name: string;
  description: string;
  pack: string;
  pallet: string;
  price: number;
  promoPrice?: number;
  isNew: boolean;
  isDistributor: boolean;
  category: string;
  imageUrl: string;
  productUrl: string;
}

export interface CategoryGroup {
  name: string;
  items: PriceItem[];
}
