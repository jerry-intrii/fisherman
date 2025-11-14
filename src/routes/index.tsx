import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Activity,
	ArrowUpRight,
	Coins,
	History,
	Sparkles,
	TrendingUp,
} from "lucide-react";
import type React from "react";
import { useEffect, useId, useState } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { signIn, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
	deleteTournamentEntry,
	getDashboardData,
	updateTournamentEntry,
} from "@/server/poker-actions";

export const Route = createFileRoute("/")({ component: Dashboard });

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

const currencyFormatter = new Intl.NumberFormat("zh-TW", {
	style: "currency",
	currency: "TWD",
	maximumFractionDigits: 0,
});

function Dashboard() {
	const { data: session } = useSession();
	const queryClient = useQueryClient();
	const [openActionId, setOpenActionId] = useState<number | null>(null);
	const [editingEntry, setEditingEntry] = useState<
		DashboardData["entries"][number] | null
	>(null);
	const [editForm, setEditForm] = useState({
		name: "",
		buyIn: 0,
		cashOut: 0,
		notes: "",
		eventDate: "",
	});
	const [editError, setEditError] = useState<string | null>(null);
	const dashboardQuery = useQuery<DashboardData>({
		queryKey: ["dashboard"],
		queryFn: () => getDashboardData(),
		enabled: Boolean(session?.user),
	});
	const gradientId = useId();
	const historyAnchorId = useId();

	const deleteMutation = useMutation({
		mutationFn: (entryId: number) =>
			deleteTournamentEntry({ data: { entryId } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
		},
	});

	const updateMutation = useMutation({
		mutationFn: (data: {
			entryId: number;
			name: string;
			buyIn: number;
			cashOut: number;
			notes?: string;
			eventTime: string;
		}) => updateTournamentEntry({ data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
			setEditingEntry(null);
			setEditError(null);
		},
		onError: () => {
			setEditError("更新失敗，請稍後再試。");
		},
	});

	useEffect(() => {
		const handler = () => setOpenActionId(null);
		window.addEventListener("click", handler);
		return () => window.removeEventListener("click", handler);
	}, []);

	if (!session?.user) {
		return <AuthGate />;
	}

	if (dashboardQuery.isPending) {
		return (
			<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
				<p className="text-lg text-slate-300">載入中...</p>
			</div>
		);
	}

	if (dashboardQuery.isError) {
		return (
			<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
				<p className="text-lg text-red-300">
					讀取資料失敗，請重新整理或稍後再試。
				</p>
			</div>
		);
	}

	const dashboard = dashboardQuery.data;
	const summary = dashboard?.summary ?? {
		totalEvents: 0,
		netProfit: 0,
		avgProfit: 0,
		roi: 0,
	};
	const chart = dashboard?.chart ?? [];
	const entries = dashboard?.entries ?? [];

	return (
		<div className="relative min-h-screen overflow-hidden bg-[#03030f] text-white">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(124,80,255,0.18),_transparent_45%)]" />

			<section className="relative z-10 mx-auto max-w-6xl px-6 py-10 space-y-8">
				<div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#151434] via-[#0b142b] to-[#050915] p-8 shadow-[0_25px_60px_rgba(2,3,14,0.85)]">
					<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(94,75,255,0.45),transparent_40%)] opacity-60 blur-3xl" />

					<div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
						<div className="space-y-4">
							<p className="text-xs uppercase tracking-[0.6em] text-slate-400">
								Fisher Man
							</p>
							<h1 className="text-4xl font-semibold leading-tight md:text-5xl">
								Balance your EV matrix, one battle at a time.
							</h1>
							<p className="text-slate-300 max-w-2xl">
								Fisher Man 將你的現場表現轉化成可視化的策略數據，
								讓每場比賽都能迅速回顧、微調決策，保持在最佳區間。
							</p>
							<div className="flex flex-wrap gap-3">
								<Button
									className="bg-gradient-to-r from-[#7f5dff] via-[#5c7dff] to-[#21d0ff] text-white shadow-[0_12px_35px_rgba(116,91,255,0.45)]"
									asChild
								>
									<Link to="/entries/new">記錄賽事</Link>
								</Button>
								<Button
									variant="outline"
									className="border-white/20 bg-white/5 text-white hover:bg-white/10"
									asChild
								>
									<a href={`#${historyAnchorId}`}>回顧歷史</a>
								</Button>
							</div>
						</div>

						<div className="grid w-full gap-4 sm:grid-cols-2 md:max-w-md">
							<HeroMetric
								label="淨利累積"
								value={currencyFormatter.format(summary.netProfit)}
								badge="Live EV"
							/>
							<HeroMetric
								label="平均每場"
								value={currencyFormatter.format(summary.avgProfit)}
								badge="Session Gain"
							/>
							<HeroMetric
								label="報酬率"
								value={`${(summary.roi * 100).toFixed(1)}%`}
								badge="ROI"
							/>
							<HeroMetric
								label="紀錄場次"
								value={`${summary.totalEvents}`}
								badge="Sessions"
							/>
						</div>
					</div>
				</div>

				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<SummaryCard
						label="Sessions Tracked"
						value={`${summary.totalEvents} 場`}
						support="完整比賽紀錄"
						icon={<History className="h-5 w-5 text-slate-100" />}
					/>
					<SummaryCard
						label="Net Profit"
						value={currencyFormatter.format(summary.netProfit)}
						support="累積淨利"
						highlight={summary.netProfit}
						icon={<TrendingUp className="h-5 w-5 text-emerald-300" />}
					/>
					<SummaryCard
						label="Average Edge"
						value={currencyFormatter.format(summary.avgProfit)}
						support="每場平均收益"
						icon={<Activity className="h-5 w-5 text-slate-200" />}
					/>
					<SummaryCard
						label="Return Rate"
						value={`${(summary.roi * 100).toFixed(1)}%`}
						support="整體報酬率"
						icon={<ArrowUpRight className="h-5 w-5 text-cyan-300" />}
					/>
				</div>

				<div className="grid gap-6 lg:grid-cols-3">
					<Panel className="lg:col-span-2">
						<div className="flex items-center justify-between mb-4">
							<div>
								<div className="flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-slate-400">
									<Sparkles className="h-4 w-4 text-[#8b6bff]" />
									Trend Lab
								</div>
								<h2 className="text-2xl font-semibold mt-1">累積盈利趨勢</h2>
								<p className="text-sm text-slate-400">
									由買入與出金推算的每場累積收益，協助調整策略節奏
								</p>
							</div>
						</div>
						{chart.length === 0 ? (
							<EmptyState message="目前尚無資料，從記錄第一場賽事開始追蹤你的成績吧！" />
						) : (
							<div className="h-72">
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart data={chart}>
										<defs>
											<linearGradient
												id={gradientId}
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="5%"
													stopColor="#22d3ee"
													stopOpacity={0.8}
												/>
												<stop
													offset="95%"
													stopColor="#0f172a"
													stopOpacity={0}
												/>
											</linearGradient>
										</defs>
										<CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
										<XAxis
											dataKey="at"
											stroke="#94a3b8"
											tickFormatter={(value) =>
												new Date(value).toLocaleDateString("zh-TW", {
													month: "numeric",
													day: "numeric",
												})
											}
										/>
										<YAxis
											stroke="#94a3b8"
											tickFormatter={(value) =>
												currencyFormatter.format(value as number)
											}
										/>
										<Tooltip
											contentStyle={{
												backgroundColor: "#0f172a",
												border: "1px solid rgba(255,255,255,0.1)",
											}}
											formatter={(value) =>
												currencyFormatter.format(value as number)
											}
											labelFormatter={(value) =>
												new Date(value).toLocaleString("zh-TW", {
													month: "short",
													day: "numeric",
													hour: "2-digit",
													minute: "2-digit",
												})
											}
										/>
										<Area
											type="monotone"
											dataKey="cumulative"
											stroke="#22d3ee"
											strokeWidth={2}
											fill={`url(#${gradientId})`}
										/>
									</AreaChart>
								</ResponsiveContainer>
							</div>
						)}
					</Panel>

					<Panel>
						<div className="flex items-center justify-between mb-4">
							<div>
								<h2 className="text-xl font-semibold">最近賽事</h2>
								<p className="text-sm text-slate-400">最新 5 筆紀錄</p>
							</div>
							<Coins className="h-5 w-5 text-amber-300" />
						</div>
						{entries.length === 0 ? (
							<EmptyState message="還沒有任何賽事紀錄唷！" />
						) : (
							<ul className="space-y-4">
								{entries.slice(0, 5).map((entry) => {
									const profit = entry.cashOut - entry.buyIn;
									return (
										<li
											key={entry.id}
											className="flex items-center justify-between"
										>
											<div>
												<p className="font-medium">{entry.name}</p>
												<p className="text-xs text-slate-400">
													{new Date(entry.eventTime).toLocaleString("zh-TW", {
														month: "short",
														day: "numeric",
														hour: "2-digit",
													})}
												</p>
											</div>
											<div className="text-right">
												<p className="text-sm text-slate-400">
													{currencyFormatter.format(entry.buyIn)} →{" "}
													{currencyFormatter.format(entry.cashOut)}
												</p>
												<ProfitTag value={profit} />
											</div>
										</li>
									);
								})}
							</ul>
						)}
					</Panel>
				</div>

				<div id={historyAnchorId}>
					<Panel>
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-xl font-semibold">完整紀錄</h2>
							<p className="text-sm text-slate-400">
								所有賽事按時間排序，方便回顧
							</p>
						</div>
						{entries.length === 0 ? (
							<EmptyState message="新增第一筆紀錄後，所有比賽都會顯示在這裡。" />
						) : (
							<div className="overflow-auto">
								<table className="w-full text-left text-sm">
									<thead className="text-slate-300">
										<tr>
											<th className="pb-2 pr-4 font-medium">時間</th>
											<th className="pb-2 pr-4 font-medium">名稱</th>
											<th className="pb-2 pr-4 font-medium text-right">買入</th>
											<th className="pb-2 pr-4 font-medium text-right">出金</th>
											<th className="pb-2 pr-4 font-medium text-right">淨利</th>
											<th className="pb-2 font-medium text-right">操作</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-white/5">
										{entries.map((entry) => {
											const profit = entry.cashOut - entry.buyIn;
											return (
												<tr key={entry.id}>
													<td className="py-3 pr-4 text-slate-400">
														{new Date(entry.eventTime).toLocaleString("zh-TW", {
															dateStyle: "medium",
															timeStyle: "short",
														})}
													</td>
													<td className="py-3 pr-4">{entry.name}</td>
													<td className="py-3 pr-4 text-right text-slate-300">
														{currencyFormatter.format(entry.buyIn)}
													</td>
													<td className="py-3 pr-4 text-right text-slate-300">
														{currencyFormatter.format(entry.cashOut)}
													</td>
													<td className="py-3 pr-4 text-right">
														<ProfitTag value={profit} />
													</td>
													<td className="py-3 text-right">
														<div className="relative inline-block text-left">
															<Button
																variant="ghost"
																size="sm"
																className="text-slate-300 hover:text-white"
																onClick={(event) => {
																	event.stopPropagation();
																	setOpenActionId((current) =>
																		current === entry.id ? null : entry.id,
																	);
																}}
															>
																⋯
															</Button>
															{openActionId === entry.id ? (
																<div
																	tabIndex={-1}
																	role="menu"
																	onClick={(event) => event.stopPropagation()}
																	onKeyDown={(event) => {
																		if (event.key === "Escape") {
																			setOpenActionId(null);
																		}
																		event.stopPropagation();
																	}}
																	className="absolute right-0 mt-2 w-32 rounded-xl border border-white/10 bg-[#0b111d] p-2 text-left shadow-[0_18px_40px_rgba(2,5,14,0.65)]"
																>
																	<button
																		type="button"
																		className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10"
																		onClick={() => {
																			setEditingEntry(entry);
																			setEditForm({
																				name: entry.name,
																				buyIn: entry.buyIn,
																				cashOut: entry.cashOut,
																				notes: entry.notes ?? "",
																				eventDate: new Date(entry.eventTime)
																					.toISOString()
																					.slice(0, 10),
																			});
																			setOpenActionId(null);
																		}}
																	>
																		修改
																	</button>
																	<button
																		type="button"
																		className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-300 transition hover:bg-white/10"
																		disabled={deleteMutation.isPending}
																		onClick={() => {
																			if (
																				confirm(
																					`確定要刪除「${entry.name}」這筆紀錄嗎？`,
																				)
																			) {
																				deleteMutation.mutate(entry.id);
																			}
																			setOpenActionId(null);
																		}}
																	>
																		刪除
																	</button>
																</div>
															) : null}
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						)}
					</Panel>
				</div>
				{editingEntry ? (
					<div className="mt-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#151434] via-[#0b142b] to-[#050915] p-6 shadow-[0_20px_45px_rgba(3,3,15,0.65)]">
						<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
							<div>
								<p className="text-xs uppercase tracking-[0.4em] text-slate-400">
									編輯賽事
								</p>
								<h3 className="text-2xl font-semibold">{editingEntry.name}</h3>
							</div>
							<div className="flex gap-3">
								<Button
									variant="outline"
									className="border-white/10 text-white hover:bg-white/10"
									onClick={() => {
										setEditingEntry(null);
										setEditError(null);
									}}
								>
									取消
								</Button>
								<Button
									disabled={updateMutation.isPending}
									className="bg-gradient-to-r from-[#7f5dff] via-[#5c7dff] to-[#21d0ff] text-white shadow-[0_12px_35px_rgba(116,91,255,0.45)]"
									onClick={() => {
										if (!editingEntry) return;
										setEditError(null);
										updateMutation.mutate({
											entryId: editingEntry.id,
											name: editForm.name.trim(),
											buyIn: Number(editForm.buyIn),
											cashOut: Number(editForm.cashOut),
											notes: editForm.notes.trim()
												? editForm.notes.trim()
												: undefined,
											eventTime: new Date(
												`${editForm.eventDate}T00:00:00`,
											).toISOString(),
										});
									}}
								>
									{updateMutation.isPending ? "儲存中…" : "儲存變更"}
								</Button>
							</div>
						</div>
						<div className="mt-6 grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label className="text-sm text-slate-200">
									賽事名稱 / 地點
								</Label>
								<Input
									value={editForm.name}
									onChange={(event) =>
										setEditForm((prev) => ({
											...prev,
											name: event.target.value,
										}))
									}
								/>
							</div>
							<div className="space-y-2">
								<Label className="text-sm text-slate-200">日期</Label>
								<Input
									type="date"
									value={editForm.eventDate}
									onChange={(event) =>
										setEditForm((prev) => ({
											...prev,
											eventDate: event.target.value,
										}))
									}
								/>
							</div>
							<div className="space-y-2">
								<Label className="text-sm text-slate-200">買入</Label>
								<Input
									type="number"
									min={0}
									value={editForm.buyIn}
									onChange={(event) =>
										setEditForm((prev) => ({
											...prev,
											buyIn: Number(event.target.value),
										}))
									}
								/>
							</div>
							<div className="space-y-2">
								<Label className="text-sm text-slate-200">出金</Label>
								<Input
									type="number"
									min={0}
									value={editForm.cashOut}
									onChange={(event) =>
										setEditForm((prev) => ({
											...prev,
											cashOut: Number(event.target.value),
										}))
									}
								/>
							</div>
							<div className="space-y-2 md:col-span-2">
								<Label className="text-sm text-slate-200">備註</Label>
								<Textarea
									rows={4}
									value={editForm.notes}
									onChange={(event) =>
										setEditForm((prev) => ({
											...prev,
											notes: event.target.value,
										}))
									}
								/>
							</div>
						</div>
						{editError ? (
							<p className="mt-4 text-sm text-rose-300">{editError}</p>
						) : null}
					</div>
				) : null}
			</section>
		</div>
	);
}

function SummaryCard({
	label,
	value,
	icon,
	highlight,
	support,
}: {
	label: string;
	value: string;
	icon: React.ReactNode;
	highlight?: number;
	support?: string;
}) {
	const valueColor =
		highlight !== undefined
			? highlight >= 0
				? "text-emerald-300"
				: "text-rose-300"
			: "text-white";

	return (
		<div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_45px_rgba(3,3,15,0.65)]">
			<div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-40" />
			<div className="relative flex items-start justify-between">
				<div>
					<p className="text-xs uppercase tracking-[0.3em] text-slate-400">
						{label}
					</p>
					<p className={cn("mt-2 text-2xl font-semibold", valueColor)}>
						{value}
					</p>
					{support ? (
						<p className="text-xs text-slate-400 mt-1">{support}</p>
					) : null}
				</div>
				<div className="rounded-xl border border-white/10 bg-white/10 p-2 text-white">
					{icon}
				</div>
			</div>
		</div>
	);
}

function Panel({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur",
				className,
			)}
		>
			<div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-30" />
			<div className="relative">{children}</div>
		</div>
	);
}

function ProfitTag({ value }: { value: number }) {
	const formatted = currencyFormatter.format(value);
	if (value === 0) {
		return <span className="text-slate-400 text-sm">{formatted}</span>;
	}
	return (
		<span
			className={`text-sm font-semibold ${
				value > 0 ? "text-emerald-300" : "text-rose-300"
			}`}
		>
			{formatted}
		</span>
	);
}

function EmptyState({ message }: { message: string }) {
	return <p className="text-sm text-slate-400">{message}</p>;
}

function AuthGate() {
	return (
		<div className="relative flex min-h-screen items-center justify-center bg-[#03030f] px-6 text-white">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(124,93,255,0.35),_transparent_45%)]" />
			<div className="relative max-w-md space-y-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#111028] via-[#090d1a] to-[#05050b] p-8 text-center shadow-[0_25px_60px_rgba(2,3,14,0.8)]">
				<div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.4em] text-slate-400">
					<Sparkles className="h-4 w-4 text-[#8b6bff]" />
					Fisher Man
				</div>
				<h1 className="text-3xl font-semibold">登入以同步你的 EV 暗帳</h1>
				<p className="text-slate-300">
					連結 Google 帳戶後，即可啟動 Fisher Man 的即時分析，還能以 GTO Wizards
					風格回顧每場作戰。
				</p>
				<Button
					size="lg"
					className="w-full bg-gradient-to-r from-[#7f5dff] via-[#5c7dff] to-[#21d0ff] text-white shadow-[0_12px_35px_rgba(116,91,255,0.45)]"
					onClick={() => signIn.social({ provider: "google" })}
				>
					以 Google 帳戶登入
				</Button>
			</div>
		</div>
	);
}

function HeroMetric({
	label,
	value,
	badge,
}: {
	label: string;
	value: string;
	badge: string;
}) {
	return (
		<div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left shadow-[0_12px_30px_rgba(2,3,14,0.65)]">
			<p className="text-xs uppercase tracking-[0.4em] text-slate-400">
				{badge}
			</p>
			<p className="mt-2 text-2xl font-semibold">{value}</p>
			<p className="text-xs text-slate-400">{label}</p>
		</div>
	);
}
