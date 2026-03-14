import { Head, useForm } from "@inertiajs/react";
import { useEffect, useRef } from "react";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/Components/ui/card";
import { Checkbox } from "@/Components/ui/checkbox";
import { ChefHat, Lock, Mail, ArrowRight, Loader2 } from "lucide-react";

export default function Login({ status }) {
	const { data, setData, post, processing, errors, reset } = useForm({
		email: "",
		password: "",
		remember: false,
	});
	const lastToastMessage = useRef(null);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const savedTheme = window.localStorage.getItem("site:theme");
		const root = window.document.documentElement;
		root.classList.remove("theme-dark", "theme-light");
		root.classList.add(savedTheme === "dark" ? "theme-dark" : "theme-light");
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!errors.email) return;
		if (errors.email === lastToastMessage.current) return;
		if (errors.email === "Your account is deactivated.") {
			window.dispatchEvent(
				new CustomEvent("app-toast", {
					detail: {
						type: "error",
						message: errors.email,
					},
				}),
			);
			lastToastMessage.current = errors.email;
		}
	}, [errors.email]);

	const submit = (e) => {
		e.preventDefault();
		post(route("login"), {
			onFinish: () => reset("password"),
		});
	};

	return (
		<div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-950 font-sans selection:bg-primary/30">
			<Head title="Staff Login | Momma's Bakeshop" />
			
			{/* High-End Background System */}
			<div className="absolute inset-0 z-0">
				<img 
					src="/bakeshop_login_bg_1773408324742.png" 
					alt="Bakery Background" 
					className="w-full h-full object-cover opacity-60 scale-105 animate-pulse-slow duration-[10s]"
				/>
				<div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/80 to-transparent shadow-[inset_0_0_500px_rgba(0,0,0,0.8)]" />
			</div>

			{/* Decorative Elements */}
			<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30 opacity-50" />
			
			<div className="relative z-10 w-full max-w-lg px-6">
				<div className="flex flex-col items-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
					<div className="h-20 w-20 rounded-[2.5rem] bg-white shadow-2xl flex items-center justify-center text-primary mb-6 rotate-3 hover:rotate-0 transition-transform duration-500 border-4 border-slate-100/10">
						<ChefHat className="h-10 w-10" strokeWidth={2.5} />
					</div>
					<h2 className="text-3xl font-black italic uppercase tracking-tighter text-white text-center">
						Momma's <span className="text-primary italic">Bakeshop</span>
					</h2>
					<p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mt-2">Internal Operations Gateway</p>
				</div>

				<Card className="border-none shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] rounded-[3rem] bg-white/95 backdrop-blur-2xl animate-in zoom-in-95 duration-1000 overflow-hidden group">
					<div className="absolute top-0 left-0 right-0 h-1.5 bg-primary/20" />
					<div className="absolute top-0 left-0 h-1.5 bg-primary w-0 group-hover:w-full transition-all duration-1000 ease-in-out" />
					
					<CardHeader className="p-10 pb-6 text-center">
						<CardTitle className="text-3xl font-black italic uppercase tracking-tight text-slate-900">
							Welcome Back
						</CardTitle>
						<CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">
							Secure Staff Authorization Required
						</CardDescription>
					</CardHeader>
					
					<CardContent className="p-10 pt-0">
						{status && (
							<div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-[11px] font-bold text-emerald-600 uppercase tracking-widest animate-in fade-in duration-500">
								{status}
							</div>
						)}

						<form onSubmit={submit} className="space-y-6">
							<div className="space-y-2">
								<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Secure Email</Label>
								<div className="relative">
									<Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
									<Input 
										id="login-email"
										type="email"
										name="email"
										value={data.email}
										autoComplete="username"
										autoFocus
										placeholder="name@mommas.com"
										onChange={(e) => setData("email", e.target.value)}
										className="h-14 pl-12 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold focus-visible:ring-primary focus-visible:border-primary transition-all text-slate-900"
									/>
								</div>
								{errors.email && (
									<p className="text-[10px] font-bold text-destructive uppercase tracking-wide ml-2 animate-in slide-in-from-left-2">{errors.email}</p>
								)}
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between ml-2">
									<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Authorization Key</Label>
								</div>
								<div className="relative">
									<Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
									<Input 
										id="login-password"
										type="password"
										name="password"
										value={data.password}
										autoComplete="current-password"
										placeholder="••••••••"
										onChange={(e) => setData("password", e.target.value)}
										className="h-14 pl-12 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold focus-visible:ring-primary focus-visible:border-primary transition-all text-slate-900"
									/>
								</div>
								{errors.password && (
									<p className="text-[10px] font-bold text-destructive uppercase tracking-wide ml-2 animate-in slide-in-from-left-2">{errors.password}</p>
								)}
							</div>

							<div className="flex items-center justify-between px-2 pt-2">
								<div className="flex items-center space-x-3">
									<Checkbox 
										id="remember" 
										checked={data.remember}
										onCheckedChange={(checked) => setData("remember", checked)}
										className="h-5 w-5 rounded-lg border-2 border-slate-200 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
									/>
									<label
										htmlFor="remember"
										className="text-[11px] font-black uppercase tracking-widest text-slate-500 cursor-pointer select-none"
									>
										Persistent Session
									</label>
								</div>
							</div>

							<Button 
								type="submit" 
								disabled={processing}
								className="w-full h-16 rounded-2xl bg-foreground text-white font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-slate-200 transition-all hover:scale-[1.02] active:scale-95 group relative overflow-hidden"
							>
								{processing ? (
									<div className="flex items-center gap-3">
										<Loader2 className="h-5 w-5 animate-spin" />
										Authenticating...
									</div>
								) : (
									<div className="flex items-center gap-3">
										Initialize Session <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
									</div>
								)}
								<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform" />
							</Button>
						</form>
					</CardContent>
				</Card>

				<div className="mt-12 text-center animate-in fade-in slide-in-from-top-4 duration-1000 delay-500">
					<p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 italic">
						&copy; 2026 Momma's Bakeshop &bull; Operational Security Layer 4.0
					</p>
				</div>
			</div>

			<style dangerouslySetInnerHTML={{ __html: `
				@keyframes pulse-slow {
					0%, 100% { transform: scale(1.05); }
					50% { transform: scale(1.1); }
				}
				.animate-pulse-slow {
					animation: pulse-slow 20s ease-in-out infinite;
				}
			`}} />
		</div>
	);
}
