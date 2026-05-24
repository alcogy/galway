<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import {
		LayoutDashboard,
		Building2,
		Package,
		PackageCheck,
		Truck,
		Boxes,
		Tag,
		MapPin,
		ClipboardSignature,
		CalendarCheck,
		BarChart3,
		ScrollText,
		Settings,
		CircleUser,
		Shield,
		PanelLeftClose,
		PanelLeftOpen,
		LogOut
	} from '@lucide/svelte';
	import { t } from '$lib/i18n';

	interface NavItem {
		href: string;
		label: string;
		icon: typeof LayoutDashboard;
		adminOnly?: boolean;
		onclick?: () => void;
	}

	interface NavGroup {
		groupLabel?: string;
		items: NavItem[];
	}

	interface Props {
		role?: 'admin' | 'general';
		onsignout?: () => void;
		logo?: Snippet;
	}

	let { role = 'general', onsignout, logo }: Props = $props();

	let collapsed = $state(false);
	let mobileOpen = $state(false);

	const primaryNavGroups = $derived<NavGroup[]>([
		{
			items: [
				{ href: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
			],
		},
		{
			groupLabel: t('nav.groupMaster'),
			items: [
				{ href: '/suppliers', label: t('nav.suppliers'), icon: Building2 },
				{ href: '/products', label: t('nav.products'), icon: Package },
				{ href: '/categories', label: t('nav.categories'), icon: Tag },
				{ href: '/customers', label: t('nav.customers'), icon: MapPin },
			],
		},
		{
			groupLabel: t('nav.groupTransactions'),
			items: [
				{ href: '/purchasing', label: t('nav.purchasing'), icon: ClipboardSignature },
				{ href: '/receiving', label: t('nav.receiving'), icon: PackageCheck },
				{ href: '/shipping', label: t('nav.shipping'), icon: Truck },
			],
		},
		{
			groupLabel: t('nav.groupManagement'),
			items: [
				{ href: '/inventory', label: t('nav.inventory'), icon: Boxes },
				{ href: '/inventory-schedules', label: t('nav.inventorySchedules'), icon: CalendarCheck },
				{ href: '/reports', label: t('nav.reports'), icon: BarChart3 },
				{ href: '/accounts', label: t('nav.accounts'), icon: Shield, adminOnly: true },
				{ href: '/audit-logs', label: t('nav.auditLogs'), icon: ScrollText, adminOnly: true },
			],
		},
	]);

	const secondaryNavItems = $derived<NavItem[]>([
		{ href: '/profile', label: t('nav.profile'), icon: CircleUser },
		{ href: '/settings', label: t('nav.settings'), icon: Settings, adminOnly: true },
		{ href: '/logout', label: t('nav.signOut'), icon: LogOut, onclick: onsignout }
	]);

	function isActive(href: string): boolean {
		if (href === '/') return page.url.pathname === href;
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}

	function closeMobile() {
		mobileOpen = false;
	}

	function visibleItems(items: NavItem[]): NavItem[] {
		return items.filter((item) => !item.adminOnly || role === 'admin');
	}
</script>

<!-- Mobile toggle -->
<button class="mobile-toggle" onclick={() => (mobileOpen = !mobileOpen)} aria-label="Toggle menu">
	{#if mobileOpen}
		<PanelLeftClose size={20} />
	{:else}
		<PanelLeftOpen size={20} />
	{/if}
</button>

<!-- Overlay -->
{#if mobileOpen}
	<button class="sidebar-overlay" onclick={closeMobile} aria-label="Close menu" tabindex="-1"
	></button>
{/if}

<aside class="sidebar" class:collapsed class:mobile-open={mobileOpen}>
	<!-- Logo -->
	<div class="sidebar-logo">
		{#if logo}
			{@render logo()}
		{:else}
			<span class="logo-text">Galway</span>
		{/if}
	</div>

	<!-- Primary Nav -->
	<nav class="sidebar-nav">
		<div class="nav-primary">
			{#each primaryNavGroups as group, gi}
				{@const items = visibleItems(group.items)}
				{#if items.length > 0}
					<div class="nav-group" class:has-label={!!group.groupLabel}>
						{#if group.groupLabel}
							<span class="group-label">{group.groupLabel}</span>
						{/if}
						{#each items as item (item.href)}
							<a
								href={item.href}
								class="nav-item"
								class:active={isActive(item.href)}
								onclick={closeMobile}
							>
								<item.icon size={18} class="nav-icon" />
								<span class="nav-label">{item.label}</span>
							</a>
						{/each}
					</div>
				{/if}
			{/each}
		</div>

		<!-- Secondary Nav -->
		<div class="nav-group secondary">
			{#each secondaryNavItems as item (item.href)}
				{#if !item.adminOnly || role === 'admin'}
					{#if item.onclick}
						<button
							class="nav-item"
							onclick={() => { item.onclick?.(); closeMobile(); }}
						>
							<item.icon size={18} class="nav-icon" />
							<span class="nav-label">{item.label}</span>
						</button>
					{:else}
						<a
							href={item.href}
							class="nav-item"
							class:active={isActive(item.href)}
							onclick={closeMobile}
						>
							<item.icon size={18} class="nav-icon" />
							<span class="nav-label">{item.label}</span>
						</a>
					{/if}
				{/if}
			{/each}
		</div>
	</nav>
</aside>

<style lang="scss">
	.sidebar {
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		width: var(--sidebar-width);
		background-color: var(--sidebar-bg);
		border-right: 1px solid var(--sidebar-border);
		display: flex;
		flex-direction: column;
		z-index: var(--z-sidebar);
		transition: width var(--transition-base);
		overflow: hidden;

		&.collapsed {
			width: 56px;

			.logo-text,
			.nav-label,
			.group-label {
				opacity: 0;
				width: 0;
				overflow: hidden;
			}

			.nav-item {
				justify-content: center;
				padding: var(--space-sm);
			}

			.nav-group.has-label {
				padding-top: var(--space-sm);

				&::before {
					display: none;
				}
			}
		}
	}

	.sidebar-logo {
		display: flex;
		align-items: center;
		height: var(--header-height);
		padding: 0 var(--space-lg);
		border-bottom: 1px solid var(--sidebar-border);
		flex-shrink: 0;
	}

	.logo-text {
		font-size: 1rem;
		font-weight: 700;
		color: var(--sidebar-text-active);
		white-space: nowrap;
		transition: opacity var(--transition-base);
	}

	.sidebar-nav {
		flex: 1;
		padding: var(--space-sm);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: var(--space-xs);
	}

	.nav-primary {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.nav-group {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding-bottom: var(--space-xs);

		&.has-label {
			padding-top: var(--space-md);
		}

		&.secondary {
			border-top: 1px solid var(--sidebar-border);
			padding-top: var(--space-sm);
		}
	}

	.group-label {
		display: block;
		padding: 0 var(--space-md);
		margin-bottom: 2px;
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--sidebar-text);
		opacity: 0.5;
		white-space: nowrap;
		transition: opacity var(--transition-base);
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-md);
		color: var(--sidebar-text);
		text-decoration: none;
		font-size: 0.8125rem;
		font-weight: 500;
		transition:
			background-color var(--transition-fast),
			color var(--transition-fast);
		white-space: nowrap;
		/* button reset */
		width: 100%;
		border: none;
		background: none;
		cursor: pointer;
		font-family: inherit;

		&:hover {
			background-color: var(--sidebar-hover);
			color: var(--sidebar-text-active);
			text-decoration: none;
		}

		&.active {
			background-color: var(--sidebar-active);
			color: var(--sidebar-text-active);
		}
	}

	.nav-label {
		transition: opacity var(--transition-base);
	}

	/* --- Mobile --- */
	.mobile-toggle {
		display: none;
		position: fixed;
		top: var(--space-md);
		left: var(--space-md);
		z-index: var(--z-header);
		width: 36px;
		height: 36px;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background-color: var(--color-bg-elevated);
		color: var(--color-text);
		cursor: pointer;
	}

	.sidebar-overlay {
		display: none;
		position: fixed;
		inset: 0;
		background-color: var(--color-bg-overlay);
		z-index: calc(var(--z-sidebar) - 1);
		border: none;
		cursor: default;
	}

	@media (max-width: 768px) {
		.sidebar {
			transform: translateX(-100%);
			width: var(--sidebar-width);

			&.mobile-open {
				transform: translateX(0);
			}

			&.collapsed {
				width: var(--sidebar-width);

				.logo-text,
				.nav-label,
				.group-label {
					opacity: 1;
					width: auto;
				}
			}
		}

		.sidebar-logo {
			padding-left: 52px;
		}

		.mobile-toggle {
			display: inline-flex;
		}

		.sidebar-overlay {
			display: block;
		}
	}
</style>
