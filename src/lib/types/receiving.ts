export interface ReceivingSlip {
	id: string;
	slip_number: string;
	received_at: string;
	supplier_id: string;
	supplier_name: string | null;
	item_count: number;
	user_name: string | null;
}

export interface ReceivingDetail {
	id: string;
	product_id: string;
	product_code: string | null;
	product_name: string | null;
	quantity: number;
	unit: string | null;
}
