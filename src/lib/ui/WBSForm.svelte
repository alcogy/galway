<script lang="ts">
	import { untrack } from 'svelte';
	import { Button } from './index.js';
	import { Plus, Trash2, ChevronUp, ChevronDown, ZoomIn, ZoomOut } from '@lucide/svelte';
	import { SelectChip } from '$lib/ui';

	// ── Types ──────────────────────────────────────────────────────────────────
	export interface Account {
		id: string;
		name: string;
	}

	export interface TaskRow {
		id: string;
		name: string;
		assignee: string; // account ID
		plannedStart: string;
		plannedEnd: string;
	}

	export interface WBSFormData {
		title: string;
		description: string;
		startDate: string;
		endDate: string;
		members: string[]; // account IDs
		tasks: TaskRow[];
	}

	interface Props {
		accounts?: Account[];
		initial?: Partial<WBSFormData>;
		holidays?: string[];
		onSave?: (data: WBSFormData) => void | Promise<void>;
		onCancel?: () => void;
	}

	let { accounts = [], initial = {}, holidays = [], onSave, onCancel }: Props = $props();

	// ── Form state ─────────────────────────────────────────────────────────────
	let title = $state(untrack(() => initial.title ?? ''));
	let description = $state(untrack(() => initial.description ?? ''));
	let startDate = $state(untrack(() => initial.startDate ?? ''));
	let endDate = $state(untrack(() => initial.endDate ?? ''));
	let members = $state<string[]>(untrack(() => initial.members ? [...initial.members] : []));
	let tasks = $state<TaskRow[]>(
		untrack(() => initial.tasks?.length ? initial.tasks.map((t) => ({ ...t })) : [makeTask()])
	);

	function makeTask(): TaskRow {
		return { id: crypto.randomUUID(), name: '', assignee: '', plannedStart: '', plannedEnd: '' };
	}

	// ── Date utilities (local-time parsing to avoid UTC/local mismatch) ─────────
	function parseDate(dateStr: string): number {
		const [y, m, d] = dateStr.split('-').map(Number);
		return new Date(y, m - 1, d).getTime();
	}
	function msToDateStr(ms: number): string {
		const d = new Date(ms);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	// ── Zoom ───────────────────────────────────────────────────────────────────
	let zoom = $state(1);
	const PX_PER_DAY = [4, 8, 16, 32] as const;
	const ZOOM_LABELS = ['全体', '月', '週', '日'] as const;
	const pxPerDay = $derived(PX_PER_DAY[zoom]);

	// ── Chart geometry ─────────────────────────────────────────────────────────
	const chartStartMs = $derived.by(() => {
		if (startDate) return parseDate(startDate);
		// First day of current month
		return new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
	});
	const chartEndMs = $derived.by(() => {
		if (endDate) return parseDate(endDate);
		// 3 months after chart start
		const y = new Date(chartStartMs).getFullYear();
		const mo = new Date(chartStartMs).getMonth();
		return new Date(y, mo + 3, 1).getTime();
	});
	const totalDays = $derived(Math.ceil((chartEndMs - chartStartMs) / 86400000) + 1);
	const chartWidth = $derived(Math.max(200, totalDays * pxPerDay));

	function toPx(dateStr: string): number {
		return ((parseDate(dateStr) - chartStartMs) / 86400000) * pxPerDay;
	}
	function pxToDateStr(px: number): string {
		const days = Math.max(0, Math.min(totalDays - 1, Math.round(px / pxPerDay)));
		return msToDateStr(chartStartMs + days * 86400000);
	}
	function barL(t: TaskRow): number {
		return t.plannedStart ? Math.max(0, toPx(t.plannedStart)) : -999;
	}
	function barW(t: TaskRow): number {
		if (!t.plannedStart || !t.plannedEnd) return 0;
		return Math.max(pxPerDay, toPx(t.plannedEnd) - toPx(t.plannedStart) + pxPerDay);
	}

	// ── Holiday set ──────────────────────────────────────────────────────────
	const holidaySet = $derived(new Set(holidays));

	// ── Month header spans ─────────────────────────────────────────────────────
	interface Span {
		label: string;
		leftPx: number;
		widthPx: number;
		dow?: number; // 日表示のみ: 0=日, 6=土
		holiday?: boolean;
	}
	const monthHeaders = $derived.by((): Span[] => {
		const result: Span[] = [];
		let y = new Date(chartStartMs).getFullYear();
		let mo = new Date(chartStartMs).getMonth();
		while (new Date(y, mo, 1).getTime() <= chartEndMs) {
			const s = Math.max(new Date(y, mo, 1).getTime(), chartStartMs);
			const e = Math.min(new Date(y, mo + 1, 1).getTime(), chartEndMs + 86400000);
			result.push({
				label: new Date(y, mo, 1).toLocaleDateString('ja-JP', {
					year: 'numeric',
					month: 'short'
				}),
				leftPx: ((s - chartStartMs) / 86400000) * pxPerDay,
				widthPx: ((e - s) / 86400000) * pxPerDay
			});
			if (++mo > 11) {
				mo = 0;
				y++;
			}
		}
		return result;
	});

	const subHeaders = $derived.by((): Span[] => {
		if (zoom === 0) return [];
		const result: Span[] = [];
		if (zoom === 3) {
			for (let d = 0; d < totalDays; d++) {
				const date = new Date(chartStartMs + d * 86400000);
				const dateStr = msToDateStr(date.getTime());
				result.push({
					label: String(date.getDate()),
					leftPx: d * pxPerDay,
					widthPx: pxPerDay,
					dow: date.getDay(),
					holiday: holidaySet.has(dateStr)
				});
			}
		} else {
			for (let d = 0; d < totalDays; d++) {
				if (new Date(chartStartMs + d * 86400000).getDay() === 1) {
					result.push({
						label: `${new Date(chartStartMs + d * 86400000).getMonth() + 1}/${new Date(chartStartMs + d * 86400000).getDate()}`,
						leftPx: d * pxPerDay,
						widthPx: Math.min(d + 7, totalDays - d) * pxPerDay
					});
				}
			}
		}
		return result;
	});

	// ── Weekend column backgrounds (日表示のみ) ──────────────────────────────
	interface WeekendCol { leftPx: number; widthPx: number; sat: boolean; }
	const weekendCols = $derived.by((): WeekendCol[] => {
		if (zoom !== 3) return [];
		const result: WeekendCol[] = [];
		for (let d = 0; d < totalDays; d++) {
			const date = new Date(chartStartMs + d * 86400000);
			const dow = date.getDay();
			const dateStr = msToDateStr(date.getTime());
			if (dow === 6)
				result.push({ leftPx: d * pxPerDay, widthPx: pxPerDay, sat: true });
			else if (dow === 0 || holidaySet.has(dateStr))
				result.push({ leftPx: d * pxPerDay, widthPx: pxPerDay, sat: false });
		}
		return result;
	});

	// ── Grid lines ─────────────────────────────────────────────────────────────
	interface GridLine {
		px: number;
		strong: boolean;
	}
	const gridLines = $derived.by((): GridLine[] => {
		const lines: GridLine[] = [];
		const monthPx: number[] = [];
		for (let d = 1; d < totalDays; d++) {
			if (new Date(chartStartMs + d * 86400000).getDate() === 1) {
				const px = d * pxPerDay;
				lines.push({ px, strong: true });
				monthPx.push(px);
			}
		}
		if (zoom === 1 || zoom === 2) {
			for (let d = 1; d < totalDays; d++) {
				if (new Date(chartStartMs + d * 86400000).getDay() === 1) {
					const px = d * pxPerDay;
					if (!monthPx.includes(px)) lines.push({ px, strong: false });
				}
			}
		} else if (zoom === 3) {
			for (let d = 1; d < totalDays; d++) {
				const px = d * pxPerDay;
				if (!monthPx.includes(px)) lines.push({ px, strong: false });
			}
		}
		return lines.sort((a, b) => a.px - b.px);
	});

	const todayPx = $derived(Math.max(0, Math.min(chartWidth, toPx(msToDateStr(new Date().getTime())))));

	// ── Row heights ────────────────────────────────────────────────────────────
	const ROW_H = 44;
	const HDR_H = 36;
	const SUB_H = 28;

	// ── Drag ──────────────────────────────────────────────────────────────────
	type DragType = 'create' | 'move' | 'resize-left' | 'resize-right';
	interface DragState {
		taskId: string;
		type: DragType;
		anchorChartX: number;
		startClientX: number;
		origStartMs: number;
		origEndMs: number;
	}

	let dragState = $state<DragState | null>(null);
	let ganttRightEl: HTMLDivElement | undefined;

	function getChartX(clientX: number): number {
		if (!ganttRightEl) return 0;
		return clientX - ganttRightEl.getBoundingClientRect().left + ganttRightEl.scrollLeft;
	}

	function onRowPointerDown(e: PointerEvent, task: TaskRow) {
		if ((e.target as HTMLElement).closest('input,button')) return;
		e.preventDefault();
		const chartX = getChartX(e.clientX);
		const hasBar = !!(task.plannedStart && task.plannedEnd);
		let type: DragType = 'create';
		const origStartMs = hasBar ? new Date(task.plannedStart).getTime() : chartStartMs;
		const origEndMs = hasBar ? new Date(task.plannedEnd).getTime() : chartStartMs;

		if (hasBar) {
			const left = barL(task);
			const width = barW(task);
			const EDGE = Math.min(12, width / 4);
			if (chartX >= left - 2 && chartX <= left + EDGE) type = 'resize-left';
			else if (chartX >= left + width - EDGE && chartX <= left + width + 2) type = 'resize-right';
			else if (chartX >= left && chartX <= left + width) type = 'move';
		}

		dragState = {
			taskId: task.id,
			type,
			anchorChartX: chartX,
			startClientX: e.clientX,
			origStartMs,
			origEndMs
		};
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

		if (type === 'create') {
			const idx = tasks.findIndex((t) => t.id === task.id);
			if (idx >= 0) {
				tasks[idx].plannedStart = pxToDateStr(chartX);
				tasks[idx].plannedEnd = pxToDateStr(chartX);
			}
		}
	}

	function onRowPointerMove(e: PointerEvent, taskId: string) {
		if (!dragState || dragState.taskId !== taskId) return;
		const idx = tasks.findIndex((t) => t.id === taskId);
		if (idx < 0) return;
		const deltaPx = e.clientX - dragState.startClientX;
		const deltaMs = (deltaPx / pxPerDay) * 86400000;
		const { type, anchorChartX, origStartMs, origEndMs } = dragState;

		if (type === 'create') {
			const curX = getChartX(e.clientX);
			const minX = Math.min(anchorChartX, curX);
			const maxX = Math.max(anchorChartX, curX) + pxPerDay;
			tasks[idx].plannedStart = pxToDateStr(minX);
			tasks[idx].plannedEnd = pxToDateStr(maxX);
		} else if (type === 'move') {
			const dur = origEndMs - origStartMs;
			const newStart = Math.max(chartStartMs, origStartMs + deltaMs);
			tasks[idx].plannedStart = new Date(newStart).toISOString().slice(0, 10);
			tasks[idx].plannedEnd = new Date(newStart + dur).toISOString().slice(0, 10);
		} else if (type === 'resize-left') {
			const newStartMs = Math.min(origStartMs + deltaMs, origEndMs - 86400000);
			tasks[idx].plannedStart = new Date(
				Math.max(chartStartMs, newStartMs)
			).toISOString().slice(0, 10);
		} else if (type === 'resize-right') {
			const newEndMs = Math.max(origEndMs + deltaMs, origStartMs + 86400000);
			tasks[idx].plannedEnd = new Date(Math.min(chartEndMs, newEndMs)).toISOString().slice(0, 10);
		}
	}

	function onRowPointerUp() {
		dragState = null;
	}

	// ── Task operations ────────────────────────────────────────────────────────
	function addTask() {
		tasks = [...tasks, makeTask()];
	}
	function removeTask(id: string) {
		tasks = tasks.filter((t) => t.id !== id);
	}
	function moveUp(idx: number) {
		if (idx === 0) return;
		const a = [...tasks];
		[a[idx - 1], a[idx]] = [a[idx], a[idx - 1]];
		tasks = a;
	}
	function moveDown(idx: number) {
		if (idx >= tasks.length - 1) return;
		const a = [...tasks];
		[a[idx], a[idx + 1]] = [a[idx + 1], a[idx]];
		tasks = a;
	}

	// Accounts selected as members — used for assignee dropdown
	const memberOptions = $derived(accounts.filter((a) => members.includes(a.id)));

	// ── Validation ─────────────────────────────────────────────────────────────
	interface FormErrors {
		title?: string;
		startDate?: string;
		endDate?: string;
	}
	let errors = $state<FormErrors>({});

	function validate(): boolean {
		const next: FormErrors = {};
		if (!title.trim()) next.title = 'タイトルは必須です';
		if (!startDate) next.startDate = '開始日は必須です';
		if (!endDate) next.endDate = '終了日は必須です';
		if (startDate && endDate && endDate < startDate)
			next.endDate = '終了日は開始日以降を指定してください';
		errors = next;
		return Object.keys(next).length === 0;
	}

	// ── Save with loading state ─────────────────────────────────────────────
	let saving = $state(false);

	async function handleSave() {
		if (!validate()) return;
		saving = true;
		try {
			await onSave?.({
				title,
				description,
				startDate,
				endDate,
				members: members.filter(Boolean),
				tasks
			});
		} finally {
			saving = false;
		}
	}
</script>

<!-- ── Basic info ──────────────────────────────────────────────────────────── -->
<div class="form-card">
	<h2 class="card-title">基本情報</h2>
	<div class="form-grid">
		<div class="field full">
			<label class="label" for="wbs-title">案件タイトル <span class="req">*</span></label>
			<input
				id="wbs-title"
				class="inp"
				class:inp-error={!!errors.title}
				type="text"
				bind:value={title}
				placeholder="プロジェクト名を入力"
			/>
			{#if errors.title}<p class="field-error">{errors.title}</p>{/if}
		</div>
		<div class="field full">
			<label class="label" for="wbs-desc">案件概要</label>
			<textarea
				id="wbs-desc"
				class="inp textarea"
				bind:value={description}
				rows="3"
				placeholder="プロジェクトの概要・目的を入力"
			></textarea>
		</div>
		<div class="field">
			<label class="label" for="wbs-start">開始日 <span class="req">*</span></label>
			<input
				id="wbs-start"
				class="inp"
				class:inp-error={!!errors.startDate}
				type="date"
				bind:value={startDate}
			/>
			{#if errors.startDate}<p class="field-error">{errors.startDate}</p>{/if}
		</div>
		<div class="field">
			<label class="label" for="wbs-end">終了日 <span class="req">*</span></label>
			<input
				id="wbs-end"
				class="inp"
				class:inp-error={!!errors.endDate}
				type="date"
				bind:value={endDate}
			/>
			{#if errors.endDate}<p class="field-error">{errors.endDate}</p>{/if}
		</div>
	</div>
</div>

<!-- ── Members ─────────────────────────────────────────────────────────────── -->
<div class="form-card">
	<h2 class="card-title">メンバー</h2>
	{#if accounts.length === 0}
		<p class="no-accounts">登録済みアカウントがありません</p>
	{:else}
		<div class="account-list">
			{#each accounts as account (account.id)}
				<SelectChip
					label={account.name}
					name="wbs-member"
					value={account.id}
					checked={members.includes(account.id)}
					onChange={(v: boolean) => {
						if (v) {
							members = [...members, account.id];
						} else {
							members = members.filter((id) => id !== account.id);
						}
					}}
				/>
				<!--<label class="account-item">
					<input
						type="checkbox"
						class="account-check"
						checked={members.includes(account.id)}
						onchange={(e) => {
							if ((e.currentTarget as HTMLInputElement).checked) {
								members = [...members, account.id];
							} else {
								members = members.filter((id) => id !== account.id);
							}
						}}
					/>
					<span class="account-name">{account.name}</span>
				</label>-->
			{/each}
		</div>
	{/if}
</div>

<!-- ── Gantt ──────────────────────────────────────────────────────────────── -->
<div class="form-card">
	<div class="card-header">
		<h2 class="card-title">ガントチャート</h2>
		<div class="gantt-controls">
			<!-- Zoom -->
			<div class="zoom-wrap">
				<button
					class="zoom-btn"
					disabled={zoom === 0}
					onclick={() => zoom--}
					aria-label="縮小"
				>
					<ZoomOut size={14} />
				</button>
				<span class="zoom-label">{ZOOM_LABELS[zoom]}</span>
				<button
					class="zoom-btn"
					disabled={zoom === 3}
					onclick={() => zoom++}
					aria-label="拡大"
				>
					<ZoomIn size={14} />
				</button>
			</div>
			<button class="add-btn" onclick={addTask}>
				<Plus size={14} />タスク追加
			</button>
		</div>
	</div>
	<p class="gantt-hint">ガントチャート上をドラッグして予定期間を設定できます。バーをドラッグして移動・リサイズも可能です。</p>

	<div class="gantt-outer">
	<div class="gantt-wrap">
		<!-- Left: fixed info panel -->
		<div class="gantt-left">
			<div class="gl-row gl-hdr" style="height:{HDR_H}px">
				<div class="col-no">#</div>
				<div class="col-name">タスク名</div>
				<div class="col-asgn">担当者</div>
				<div class="col-dates">予定期間</div>
				<div class="col-ops"></div>
			</div>
			<div class="gl-row gl-sub" style="height:{SUB_H}px"></div>
			{#each tasks as task, i (task.id)}
				<div class="gl-row gl-data" style="height:{ROW_H}px">
					<div class="col-no">
						<span class="row-num">{i + 1}</span>
						<div class="reorder-btns">
							<button
								class="icon-btn-xs"
								onclick={() => moveUp(i)}
								disabled={i === 0}
								aria-label="上へ"
							>
								<ChevronUp size={11} />
							</button>
							<button
								class="icon-btn-xs"
								onclick={() => moveDown(i)}
								disabled={i === tasks.length - 1}
								aria-label="下へ"
							>
								<ChevronDown size={11} />
							</button>
						</div>
					</div>
					<div class="col-name">
						<input
							class="cell-inp"
							type="text"
							value={task.name}
							oninput={(e) => {
								task.name = (e.currentTarget as HTMLInputElement).value;
							}}
							placeholder="タスク名"
						/>
					</div>
					<div class="col-asgn">
						<select
							class="cell-sel"
							value={task.assignee}
							onchange={(e) => {
								task.assignee = (e.currentTarget as HTMLSelectElement).value;
							}}
						>
							<option value="">未選択</option>
							{#each memberOptions as account (account.id)}
								<option value={account.id}>{account.name}</option>
							{/each}
						</select>
					</div>
					<div class="col-dates">
						<input
							class="cell-inp cell-date"
							type="date"
							bind:value={task.plannedStart}
						/>
						<input
							class="cell-inp cell-date"
							type="date"
							bind:value={task.plannedEnd}
						/>
					</div>
					<div class="col-ops">
						<button
							class="icon-btn danger"
							onclick={() => removeTask(task.id)}
							disabled={tasks.length === 1}
							aria-label="削除"
						>
							<Trash2 size={14} />
						</button>
					</div>
				</div>
			{/each}
		</div>

		<!-- Right: scrollable Gantt timeline -->
		<div class="gantt-right" bind:this={ganttRightEl}>
			<!-- Month header -->
			<div class="gr-hdr" style="height:{HDR_H}px;width:{chartWidth}px">
				{#each monthHeaders as m (m.label)}
					<div
						class="month-cell"
						style="left:{m.leftPx.toFixed(1)}px;width:{m.widthPx.toFixed(1)}px"
					>
						{m.label}
					</div>
				{/each}
			</div>
			<!-- Sub-unit header -->
			<div class="gr-sub" style="height:{SUB_H}px;width:{chartWidth}px">
				{#each subHeaders as s (s.leftPx)}
					<div
						class="sub-cell"
						class:sub-sat={s.dow === 6}
						class:sub-sun={s.dow === 0 || s.holiday === true}
						style="left:{s.leftPx.toFixed(1)}px;width:{s.widthPx.toFixed(1)}px"
					>
						{s.label}
					</div>
				{/each}
			</div>
			<!-- Task rows -->
			{#each tasks as task (task.id)}
				<div
					class="gr-row-edit"
					class:drag-move={dragState?.taskId === task.id && dragState.type === 'move'}
					class:drag-resize={dragState?.taskId === task.id &&
						(dragState.type === 'resize-left' || dragState.type === 'resize-right')}
					style="height:{ROW_H}px;width:{chartWidth}px"
					role="none"
					onpointerdown={(e) => onRowPointerDown(e, task)}
					onpointermove={(e) => onRowPointerMove(e, task.id)}
					onpointerup={onRowPointerUp}
				>
					<!-- Weekend column backgrounds -->
					{#each weekendCols as col (col.leftPx)}
						<div
							class="weekend-col"
							class:weekend-sat={col.sat}
							class:weekend-sun={!col.sat}
							style="left:{col.leftPx.toFixed(1)}px;width:{col.widthPx.toFixed(1)}px"
						></div>
					{/each}
					<!-- Grid lines -->
					{#each gridLines as line (line.px)}
						<div
							class="vline"
							class:vline-strong={line.strong}
							style="left:{line.px.toFixed(1)}px"
						></div>
					{/each}
					<!-- Today line -->
					<div class="today-line" style="left:{todayPx.toFixed(1)}px"></div>
					<!-- Planned bar -->
					{#if task.plannedStart && task.plannedEnd}
						<div
							class="edit-bar"
							style="left:{barL(task).toFixed(1)}px;width:{barW(task).toFixed(1)}px"
						>
							<div class="bar-edge bar-edge-l"></div>
							<div class="bar-edge bar-edge-r"></div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
	</div>
</div>

<!-- ── Actions ────────────────────────────────────────────────────────────── -->
<div class="form-actions">
	<Button variant="secondary" onclick={onCancel} disabled={saving}>キャンセル</Button>
	<Button variant="primary" onclick={handleSave} disabled={saving}>
		{#if saving}保存中...{:else}保存{/if}
	</Button>
</div>

<style lang="scss">
	/* ── Cards ── */
	.form-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-xl);
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
	}

	.card-title {
		font-size: 0.9375rem;
		font-weight: 600;
	}

	/* ── Form grid ── */
	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-md) var(--space-xl);

		@media (max-width: 640px) {
			grid-template-columns: 1fr;
		}
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);

		&.full {
			grid-column: 1 / -1;
		}
	}

	.label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.req {
		color: var(--color-danger);
	}

	.inp-error {
		border-color: var(--color-danger) !important;

		&:focus {
			box-shadow: 0 0 0 3px var(--color-danger-light) !important;
		}
	}

	.field-error {
		font-size: 0.75rem;
		color: var(--color-danger);
		margin: 0;
	}

	/* ── Inputs ── */
	.inp {
		height: 36px;
		padding: 0 var(--space-md);
		background-color: var(--color-input-bg);
		color: var(--color-text);
		border: 1px solid var(--color-input-border);
		border-radius: var(--radius-md);
		font-family: inherit;
		font-size: 0.8125rem;
		transition:
			border-color var(--transition-fast),
			box-shadow var(--transition-fast);

		&::placeholder {
			color: var(--color-input-placeholder);
		}

		&:focus {
			outline: none;
			border-color: var(--color-border-focus);
			box-shadow: 0 0 0 3px var(--color-primary-light);
		}

		&.textarea {
			height: auto;
			padding: var(--space-sm) var(--space-md);
			resize: vertical;
			line-height: 1.5;
		}
	}

	/* ── Members ── */
	.no-accounts {
		font-size: 0.8125rem;
		color: var(--color-text-tertiary);
		margin: 0;
	}

	.account-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm) var(--space-md);
	}

	.account-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		cursor: pointer;
		user-select: none;
	}

	.account-check {
		width: 15px;
		height: 15px;
		flex-shrink: 0;
		accent-color: var(--color-primary);
		cursor: pointer;
	}

	.account-name {
		font-size: 0.8125rem;
		color: var(--color-text);
	}

	/* ── Buttons ── */
	.add-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		height: 30px;
		padding: 0 var(--space-md);
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: 0.8125rem;
		font-family: inherit;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all var(--transition-fast);
		white-space: nowrap;

		&:hover {
			background-color: var(--color-hover);
			color: var(--color-text);
		}
	}

	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		flex-shrink: 0;
		background: none;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		color: var(--color-text-tertiary);
		transition: all var(--transition-fast);

		&:hover:not(:disabled) {
			background-color: var(--color-hover);
			color: var(--color-text-secondary);
		}

		&.danger:hover:not(:disabled) {
			background-color: var(--color-danger-light);
			color: var(--color-danger);
		}

		&:disabled {
			opacity: 0.3;
			cursor: not-allowed;
		}
	}

	.icon-btn-xs {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		background: none;
		border: none;
		border-radius: 3px;
		cursor: pointer;
		color: var(--color-text-tertiary);
		padding: 0;
		transition: all var(--transition-fast);

		&:hover:not(:disabled) {
			background-color: var(--color-hover);
			color: var(--color-text-secondary);
		}

		&:disabled {
			opacity: 0.2;
			cursor: not-allowed;
		}
	}

	/* ── Gantt header ── */
	.gantt-hint {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		margin-top: calc(-1 * var(--space-xs));
	}

	.gantt-controls {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.zoom-wrap {
		display: flex;
		align-items: center;
		gap: 2px;
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 2px;
	}

	.zoom-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition:
			background-color var(--transition-fast),
			color var(--transition-fast);

		&:hover:not(:disabled) {
			background-color: var(--color-hover);
			color: var(--color-text);
		}

		&:disabled {
			opacity: 0.35;
			cursor: not-allowed;
		}
	}

	.zoom-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text);
		min-width: 24px;
		text-align: center;
	}

	/* ── Gantt layout ── */
	.gantt-outer {
		overflow-x: auto;
	}

	.gantt-wrap {
		display: flex;
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-lg);
		overflow: hidden;
		background-color: var(--color-bg-base);
	}

	/* Left fixed panel — col widths: 50+145+100+200+35=530 */
	.gantt-left {
		flex-shrink: 0;
		width: 530px;
		border-right: 2px solid var(--color-border);
		background-color: var(--color-bg-elevated);
		z-index: 1;
	}

	.gl-row {
		display: flex;
		align-items: center;
		border-bottom: 1px solid var(--color-border-light);

		&:last-child {
			border-bottom: none;
		}
	}

	.gl-hdr {
		background-color: var(--color-bg-sunken);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.gl-sub {
		background-color: var(--color-bg-sunken);
		border-bottom: 1px solid var(--color-border);
	}

	.gl-data {
		font-size: 0.8125rem;
	}

	.col-no {
		width: 50px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2px;
		padding: 0 var(--space-xs);
	}

	.row-num {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		min-width: 12px;
		text-align: center;
	}

	.reorder-btns {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.col-name {
		width: 145px;
		flex-shrink: 0;
		padding: 0 var(--space-sm);
	}

	.col-asgn {
		width: 100px;
		flex-shrink: 0;
		padding: 0 var(--space-sm);
	}

	.col-dates {
		width: 200px;
		flex-shrink: 0;
		padding: 0 var(--space-sm);
		overflow: hidden;
		display: flex;
		gap: 2px;
		justify-content: center;
	}

	.col-ops {
		width: 35px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.cell-inp {
		width: 100%;
		height: 28px;
		padding: 0 var(--space-sm);
		background-color: transparent;
		color: var(--color-text);
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		font-family: inherit;
		font-size: 0.8125rem;
		transition:
			border-color var(--transition-fast),
			background-color var(--transition-fast);

		&::placeholder {
			color: var(--color-input-placeholder);
		}

		&:hover {
			border-color: var(--color-border);
			background-color: var(--color-input-bg);
		}

		&:focus {
			outline: none;
			border-color: var(--color-border-focus);
			background-color: var(--color-input-bg);
			box-shadow: 0 0 0 2px var(--color-primary-light);
		}
	}

	.cell-sel {
		width: 100%;
		height: 28px;
		padding: 0 var(--space-sm);
		background-color: transparent;
		color: var(--color-text);
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		font-family: inherit;
		font-size: 0.8125rem;
		cursor: pointer;
		transition:
			border-color var(--transition-fast),
			background-color var(--transition-fast);

		&:hover {
			border-color: var(--color-border);
			background-color: var(--color-input-bg);
		}

		&:focus {
			outline: none;
			border-color: var(--color-border-focus);
			background-color: var(--color-input-bg);
			box-shadow: 0 0 0 2px var(--color-primary-light);
		}

		option {
			background-color: var(--color-bg-elevated);
		}
	}

	.cell-date {
		height: 18px;
		font-size: 0.6875rem;
		padding: 0 4px;
	}

	.date-val {
		color: var(--color-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		display: block;
	}

	.date-unset {
		color: var(--color-text-tertiary);
	}

	/* Right scrollable panel */
	.gantt-right {
		flex: 1;
		overflow-x: auto;
		min-width: 0;
		background-color: var(--color-bg-sunken);
	}

	.gr-hdr,
	.gr-sub,
	.gr-row-edit {
		position: relative;
		border-bottom: 1px solid var(--color-border-light);
		overflow: hidden;
		background-color: var(--color-bg-elevated);
	}

	.gr-hdr {
		background-color: var(--color-bg-sunken);
	}

	.gr-sub {
		background-color: var(--color-bg-sunken);
		border-bottom: 1px solid var(--color-border);
	}

	.gr-row-edit {
		cursor: crosshair;
		user-select: none;
		transition: background-color var(--transition-fast);

		&:hover {
			background-color: var(--color-hover);
		}

		&.drag-move {
			cursor: move;
		}

		&.drag-resize {
			cursor: ew-resize;
		}

		&:last-child {
			border-bottom: none;
		}
	}

	.month-cell {
		position: absolute;
		top: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		border-right: 1px solid var(--color-border-light);
		white-space: nowrap;
		overflow: hidden;
		padding: 0 var(--space-xs);
	}

	.sub-cell {
		position: absolute;
		top: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.6875rem;
		color: var(--color-text-secondary);
		border-right: 1px solid var(--color-border-light);
		white-space: nowrap;
		overflow: hidden;
		padding: 0 2px;

		&.sub-sat {
			background-color: rgba(96, 165, 250, 0.15);
			color: #3b82f6;
		}
		&.sub-sun {
			background-color: rgba(248, 113, 113, 0.15);
			color: #ef4444;
		}
	}

	.weekend-col {
		position: absolute;
		top: 0;
		bottom: 0;
		pointer-events: none;

		&.weekend-sat {
			background-color: rgba(96, 165, 250, 0.07);
		}
		&.weekend-sun {
			background-color: rgba(248, 113, 113, 0.07);
		}
	}

	.vline {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 1px;
		background-color: var(--color-border-light);
		pointer-events: none;

		&.vline-strong {
			background-color: var(--color-border);
		}
	}

	.today-line {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
		background-color: var(--color-danger);
		opacity: 0.6;
		z-index: 2;
		pointer-events: none;
	}

	/* Editable bar */
	.edit-bar {
		position: absolute;
		top: 10px;
		height: 24px;
		background-color: var(--color-primary-light);
		border: 1.5px solid var(--color-primary);
		border-radius: 4px;
		cursor: move;
		z-index: 3;
	}

	.bar-edge {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 10px;
		cursor: ew-resize;
		background-color: var(--color-primary);
		opacity: 0.35;
		transition: opacity var(--transition-fast);

		&:hover {
			opacity: 0.6;
		}

		&.bar-edge-l {
			left: 0;
			border-radius: 2px 0 0 2px;
		}

		&.bar-edge-r {
			right: 0;
			border-radius: 0 2px 2px 0;
		}
	}

	/* ── Actions ── */
	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-md);
	}
</style>
