<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import {
		LayoutDashboard,
		ListTodo,
		Sheet,
		CircleUser,
		Shield,
		Settings,
		PanelLeftClose,
		PanelLeftOpen,
		Sun,
		Moon,
		Monitor,
		LogOut
	} from '@lucide/svelte';

	interface NavItem {
		href: string;
		label: string;
		icon: typeof LayoutDashboard;
		adminOnly?: boolean;
	}

	interface Props {
		role?: 'admin' | 'general';
		theme?: 'light' | 'dark' | 'system';
		onthemechange?: (theme: 'light' | 'dark' | 'system') => void;
		logo?: Snippet;
	}

	let { role = 'general', theme = 'system', onthemechange, logo }: Props = $props();

	let collapsed = $state(false);
	let mobileOpen = $state(false);

	const primaryNavItems: NavItem[] = [
		{ href: '/', label: 'ダッシュボード', icon: LayoutDashboard },
		{ href: '/wbs', label: 'WBS', icon: Sheet },
		{ href: '/tasks', label: '作業一覧', icon: ListTodo },
		{ href: '/settings', label: '設定', icon: Settings, adminOnly: true },
		{ href: '/accounts', label: 'アカウント管理', icon: Shield, adminOnly: true }
	];

	const secondaryNavItems: NavItem[] = [
		{ href: '/profile', label: 'プロフィール', icon: CircleUser },
		{ href: '/logout', label: 'サインアウト', icon: LogOut }
	];

	const themeOptions = [
		{ value: 'light' as const, icon: Sun, label: 'Light' },
		{ value: 'dark' as const, icon: Moon, label: 'Dark' },
		{ value: 'system' as const, icon: Monitor, label: 'System' }
	];

	function isActive(href: string): boolean {
		if (href === '/') return page.url.pathname === href;
		return page.url.pathname.startsWith(href);
	}

	function closeMobile() {
		mobileOpen = false;
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
			<span class="logo-text">AES PROGRESS</span>
		{/if}
	</div>

	<!-- Nav -->
	<nav class="sidebar-nav">
		<div class="nav-group">
			{#each primaryNavItems as item (item.href)}
				{#if !item.adminOnly || role === 'admin'}
					<a
						href={item.href}
						class="nav-item"
						class:active={isActive(item.href)}
						onclick={closeMobile}
					>
						<item.icon size={18} />
						<span class="nav-label">{item.label}</span>
					</a>
				{/if}
			{/each}
		</div>
		<div class="nav-group">
			{#each secondaryNavItems as item (item.href)}
				{#if !item.adminOnly || role === 'admin'}
					<a
						href={item.href}
						class="nav-item"
						class:active={isActive(item.href)}
						onclick={closeMobile}
					>
						<item.icon size={18} />
						<span class="nav-label">{item.label}</span>
					</a>
				{/if}
			{/each}
		</div>
	</nav>

	<!-- Footer -->
	<div class="sidebar-footer">
		<!-- Theme switcher -->
		<div class="theme-switcher">
			{#each themeOptions as opt (opt.value)}
				<button
					class="theme-btn"
					class:active={theme === opt.value}
					onclick={() => onthemechange?.(opt.value)}
					aria-label="{opt.label} theme"
					title={opt.label}
				>
					<opt.icon size={14} />
				</button>
			{/each}
		</div>
	</div>
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
			.nav-label {
				opacity: 0;
				width: 0;
				overflow: hidden;
			}

			.nav-item {
				justify-content: center;
				padding: var(--space-sm);
			}

			.theme-switcher {
				flex-direction: column;
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
		gap: var(--space-sm);
	}

	.nav-group {
		display: flex;
		flex-direction: column;
		gap: 2px;
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

	.sidebar-footer {
		padding: var(--space-sm) var(--space-md);
		border-top: 1px solid var(--sidebar-border);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		flex-shrink: 0;
	}

	.theme-switcher {
		display: flex;
		gap: 2px;
		background-color: var(--sidebar-switcher-bg);
		border-radius: var(--radius-md);
		padding: 2px;
		transition: flex-direction var(--transition-base);
	}

	.theme-btn {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 26px;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--sidebar-text);
		cursor: pointer;
		transition:
			background-color var(--transition-fast),
			color var(--transition-fast);

		&:hover {
			color: var(--sidebar-text-active);
		}

		&.active {
			background-color: var(--sidebar-switcher-active);
			color: var(--sidebar-text-active);
		}
	}

	.collapse-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 28px;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--sidebar-text);
		cursor: pointer;
		transition:
			background-color var(--transition-fast),
			color var(--transition-fast);

		&:hover {
			background-color: var(--sidebar-hover);
			color: var(--sidebar-text-active);
		}
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
				.nav-label {
					opacity: 1;
					width: auto;
				}

				.theme-switcher {
					flex-direction: row;
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

		.collapse-btn {
			display: none;
		}
	}
</style>
