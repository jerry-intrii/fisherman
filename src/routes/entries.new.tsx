import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { signIn, useSession } from "@/lib/auth-client";
import {
	createTournamentEntry,
	getTournamentNameSuggestions,
} from "@/server/poker-actions";

type EntryFormValues = {
	name: string;
	buyIn: number;
	cashOut: number;
	notes: string;
	eventTime: string;
};

export const Route = createFileRoute("/entries/new")({
	component: EntryFormRoute,
});

function EntryFormRoute() {
	const { data: session } = useSession();
	if (!session?.user) {
		return (
			<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 text-center space-y-4">
				<div>
					<h1 className="text-3xl font-semibold mb-2">需要登入才能記錄賽事</h1>
					<p className="text-slate-400 mb-6">
						使用 Google 登入後，就能開始同步你的賽事成績。
					</p>
					<Button
						size="lg"
						onClick={() => signIn.social({ provider: "google" })}
					>
						立即登入
					</Button>
				</div>
			</div>
		);
	}

	return <EntryForm />;
}

function EntryForm() {
	const navigate = useNavigate({ from: "/entries/new" });
	const queryClient = useQueryClient();
	const [nameQuery, setNameQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [showSuggestions, setShowSuggestions] = useState(false);
	const hideDropdownTimeout = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const [serverError, setServerError] = useState<string | null>(null);

	const form = useForm<EntryFormValues>({
		defaultValues: {
			name: "",
			buyIn: 0,
			cashOut: 0,
			notes: "",
			eventTime: getDefaultDate(),
		},
		onSubmit: async ({ value }) => {
			const payload = {
				name: value.name.trim(),
				buyIn: Number(value.buyIn),
				cashOut: Number(value.cashOut),
				notes: value.notes.trim() ? value.notes.trim() : undefined,
				eventTime: new Date(`${value.eventTime}T00:00:00`).toISOString(),
			};

			await mutation.mutateAsync(payload);
		},
	});

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedQuery(nameQuery);
		}, 200);
		return () => clearTimeout(timer);
	}, [nameQuery]);

	useEffect(() => {
		return () => {
			if (hideDropdownTimeout.current) {
				clearTimeout(hideDropdownTimeout.current);
			}
		};
	}, []);

	const suggestionsQuery = useQuery({
		queryKey: ["tournament-name-suggestions", debouncedQuery],
		queryFn: () =>
			getTournamentNameSuggestions({
				data: { query: debouncedQuery },
			}),
		enabled: showSuggestions,
		staleTime: 1000 * 30,
	});
	const suggestions = suggestionsQuery.data ?? [];

	const mutation = useMutation({
		mutationFn: (input: {
			name: string;
			buyIn: number;
			cashOut: number;
			notes?: string;
			eventTime: string;
		}) => createTournamentEntry({ data: input }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
			setNameQuery("");
			navigate({ to: "/" });
		},
		onError: () => {
			setServerError("送出失敗，請稍後再試。");
		},
	});

	const openSuggestions = () => {
		if (hideDropdownTimeout.current) {
			clearTimeout(hideDropdownTimeout.current);
			hideDropdownTimeout.current = null;
		}
		setShowSuggestions(true);
	};

	const closeSuggestions = () => {
		if (hideDropdownTimeout.current) {
			clearTimeout(hideDropdownTimeout.current);
		}
		hideDropdownTimeout.current = setTimeout(() => {
			setShowSuggestions(false);
		}, 120);
	};

	const suggestionsVisible =
		showSuggestions && (suggestionsQuery.isLoading || suggestions.length > 0);

	return (
		<div className="min-h-screen bg-slate-950 text-white">
			<div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm text-slate-400">新增賽事</p>
						<h1 className="text-3xl font-semibold tracking-tight">
							記錄你的每一場牌桌
						</h1>
					</div>
					<Button variant="ghost" className="text-slate-300" asChild>
						<Link to="/">
							<ArrowLeft className="mr-2 h-4 w-4" />
							返回儀表板
						</Link>
					</Button>
				</div>

				<div className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 backdrop-blur">
					<div className="flex flex-col gap-3 pb-6 border-b border-white/10">
						<div className="flex items-center gap-3">
							<div className="rounded-full bg-cyan-500/10 p-3">
								<Trophy className="h-6 w-6 text-cyan-300" />
							</div>
							<div>
								<h2 className="text-xl font-semibold">比賽資訊</h2>
								<p className="text-sm text-slate-400">
									填寫買入、出金與時間，幫助系統計算你的淨利。
								</p>
							</div>
						</div>
					</div>

					<form
						className="mt-6 space-y-6"
						onSubmit={(e) => {
							e.preventDefault();
							setServerError(null);
							form.handleSubmit();
						}}
					>
						<div className="space-y-4">
							<form.Field name="name">
								{(field) => (
									<div className="space-y-2">
										<Label className="text-sm text-slate-200">
											賽事名稱 / 地點 <span className="text-rose-300">*</span>
										</Label>
										<div className="relative">
											<Input
												placeholder="例如：CTP 台中崇德、APT 主賽、現金桌 100/200"
												autoComplete="off"
												value={field.state.value}
												onFocus={openSuggestions}
												onBlur={closeSuggestions}
												onChange={(event) => {
													const value = event.target.value;
													field.handleChange(value);
													setNameQuery(value);
													openSuggestions();
												}}
											/>
											{suggestionsVisible && (
												<div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-white/10 bg-[#0b0f1a] p-2 shadow-[0_18px_40px_rgba(2,5,14,0.65)]">
													{suggestionsQuery.isLoading ? (
														<p className="py-2 text-center text-xs text-slate-400">
															載入建議…
														</p>
													) : suggestions.length ? (
														suggestions.map((suggestion) => (
															<button
																key={suggestion}
																type="button"
																onMouseDown={(event) => event.preventDefault()}
																onClick={() => {
																	field.handleChange(suggestion);
																	setNameQuery(suggestion);
																	setShowSuggestions(false);
																}}
																className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10"
															>
																{suggestion}
															</button>
														))
													) : (
														<p className="py-2 text-center text-xs text-slate-400">
															沒有匹配的建議，可直接使用你的輸入。
														</p>
													)}
												</div>
											)}
										</div>
										<p className="text-xs text-slate-500">
											可輸入實體地點或賽事名稱，系統會在下一次輸入時提供選單。
										</p>
									</div>
								)}
							</form.Field>

							<div className="grid gap-4 md:grid-cols-2">
								<form.Field name="buyIn">
									{(field) => (
										<div className="space-y-2">
											<Label className="text-sm text-slate-200">
												買入 <span className="text-rose-300">*</span>
											</Label>
											<Input
												type="number"
												min={0}
												value={field.state.value}
												onChange={(event) =>
													field.handleChange(Number(event.target.value))
												}
											/>
										</div>
									)}
								</form.Field>

								<form.Field name="cashOut">
									{(field) => (
										<div className="space-y-2">
											<Label className="text-sm text-slate-200">
												出金 <span className="text-rose-300">*</span>
											</Label>
											<Input
												type="number"
												min={0}
												value={field.state.value}
												onChange={(event) =>
													field.handleChange(Number(event.target.value))
												}
											/>
										</div>
									)}
								</form.Field>
							</div>

							<form.Field name="eventTime">
								{(field) => (
									<div className="space-y-2">
										<Label className="text-sm text-slate-200">
											日期 <span className="text-rose-300">*</span>
										</Label>
										<div className="flex items-center gap-2">
											<CalendarDays className="h-4 w-4 text-slate-400" />
											<Input
												type="date"
												value={field.state.value}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
											/>
										</div>
										<p className="text-xs text-slate-500">
											以 YYYY/MM/DD 格式選擇賽事日期。
										</p>
									</div>
								)}
							</form.Field>

							<form.Field name="notes">
								{(field) => (
									<div className="space-y-2">
										<Label className="text-sm text-slate-200">備註</Label>
										<Textarea
											rows={4}
											placeholder="可補充盲注級別、關鍵牌局或心情。"
											value={field.state.value}
											onChange={(event) =>
												field.handleChange(event.target.value)
											}
										/>
									</div>
								)}
							</form.Field>
						</div>

						{serverError ? (
							<p className="text-sm text-rose-300">{serverError}</p>
						) : null}

						<Button
							type="submit"
							size="lg"
							className="w-full"
							disabled={mutation.isPending}
						>
							{mutation.isPending ? "送出中..." : "儲存紀錄"}
						</Button>
					</form>
				</div>
			</div>
		</div>
	);
}

function getDefaultDate() {
	const now = new Date();
	const year = now.getFullYear();
	const month = `${now.getMonth() + 1}`.padStart(2, "0");
	const day = `${now.getDate()}`.padStart(2, "0");
	return `${year}-${month}-${day}`;
}
