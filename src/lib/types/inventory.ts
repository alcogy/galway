export interface InventoryItem {
	product_id: string;
	product_code: string;
	product_name: string;
	quantity: number;
	unit: string;
	min_quantity: number;
	updated_at: string;
}

export interface InventorySchedule {
	id: string;
	scheduled_at: string;
	title: string;
	note: string | null;
	status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
}
