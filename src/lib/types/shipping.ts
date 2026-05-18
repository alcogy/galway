export interface Customer {
	id: string;
	name: string;
	tel: string | null;
	zipcode: string | null;
	address: string | null;
	email: string | null;
	note: string | null;
	slip_count: number;
}

export interface ShippingSlip {
	id: string;
	slip_number: string;
	shipped_at: string;
	customer_name: string | null;
	item_count: number;
	user_name: string | null;
}

export interface ShippingDetail {
	id: string;
	product_id: string;
	product_code: string | null;
	product_name: string | null;
	quantity: number;
	unit: string | null;
}
