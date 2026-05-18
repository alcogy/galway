export interface PaginationParams {
	page: number;
	perPage: number;
}

export interface PaginationMeta {
	page: number;
	perPage: number;
	total: number;
	totalPages: number;
}

export type Role = 'admin' | 'general';

export interface User {
	id: string;
	email: string;
	name: string;
	role: Role;
	created_at: string;
}
