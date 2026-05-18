export interface ProductCategory {
	id: string;
	name: string;
	description: string | null;
	product_count: number;
}

export interface Product {
	id: string;
	code: string;
	name: string;
	unit: string;
	description: string | null;
	category_id: string | null;
	category_name: string | null;
	min_quantity: number;
}
