import { Link } from "@tanstack/react-router";
import { Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signIn, signOut, useSession } from "@/lib/auth-client";

export default function Header() {
	const { data: session } = useSession();

	return (
		<header className="sticky top-0 z-40 border-b border-white/10 bg-[#05060d]/80 backdrop-blur-xl">
			<div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 text-white">
				<Link
					to="/"
					className="flex items-center gap-3 font-semibold tracking-tight"
				>
					<div className="rounded-2xl bg-gradient-to-br from-[#7f5dff] via-[#5c7dff] to-[#21d0ff] p-2 text-white shadow-[0_0_18px_rgba(95,80,255,0.5)]">
						<Wallet className="h-5 w-5" />
					</div>
					<div className="leading-tight">
						<p className="text-lg font-bold tracking-[0.08em]">Fisher Man</p>
						<p className="text-xs font-normal text-slate-400">
							Precision Poker Intelligence
						</p>
					</div>
				</Link>

				<nav className="hidden items-center gap-6 text-sm md:flex">
					<NavLink to="/" label="儀表板" />
					<NavLink to="/entries/new" label="記錄賽事" />
				</nav>

				<div className="flex items-center gap-3">
					{session?.user ? (
						<>
							<div className="text-right">
								<p className="text-sm font-medium text-white">
									{session.user.name ?? session.user.email ?? "玩家"}
								</p>
								<p className="text-xs text-slate-400">
									{session.user.email ?? ""}
								</p>
							</div>
							<Button
								variant="outline"
								className="border-white/10 bg-white/5 text-white hover:bg-white/10"
								onClick={() => signOut()}
							>
								登出
							</Button>
						</>
					) : (
						<Button
							className="bg-gradient-to-r from-[#7f5dff] via-[#5c7dff] to-[#21d0ff] text-white shadow-[0_0_20px_rgba(124,93,255,0.4)]"
							onClick={() => signIn.social({ provider: "google" })}
						>
							以 Google 登入
						</Button>
					)}
				</div>
			</div>
		</header>
	);
}

function NavLink({ to, label }: { to: string; label: string }) {
	return (
		<Link
			to={to}
			className="text-slate-300 transition hover:text-white"
			activeProps={{ className: "text-white font-semibold" }}
		>
			{label}
		</Link>
	);
}
