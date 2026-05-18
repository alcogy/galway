export interface PurchaseOrder {
	id: string;
	order_number: string;
	ordered_at: string;
	expected_at: string | null;
	supplier_name: string;
	status: 'draft' | 'ordered' | 'received' | 'cancelled';
	item_count: number;
	user_name: string | null;
}

export interface PurchaseOrderDetail {
	id: string;
	product_id: string;
	product_code: string | null;
	product_name: string | null;
	quantity: number;
	unit: string | null;
}
