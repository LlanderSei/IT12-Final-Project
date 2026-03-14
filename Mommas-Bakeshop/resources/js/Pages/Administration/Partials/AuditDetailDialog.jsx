import React, { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/Components/ui/dialog";
import { Badge } from "@/Components/ui/badge";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { 
	User, 
	Database, 
	Activity, 
	Globe, 
	Calendar, 
	FileCode,
	History,
	Diff
} from "lucide-react";
import { Separator } from "@/Components/ui/separator";
import { Button } from "@/Components/ui/button";

export default function AuditDetailDialog({ open, onOpenChange, audit }) {
	if (!audit) return null;

	const formatChanges = (jsonString) => {
		if (!jsonString) return null;
		try {
			const changes = JSON.parse(jsonString);
			return changes;
		} catch (e) {
			return null;
		}
	};

	const previousChanges = formatChanges(audit.PreviousChanges);
	const savedChanges = formatChanges(audit.SavedChanges);

	const actionColor = {
		'Created': 'bg-emerald-500',
		'Create': 'bg-emerald-500',
		'Add': 'bg-emerald-500',
		'Deleted': 'bg-destructive',
		'Delete': 'bg-destructive',
	}[audit.Action] || 'bg-blue-500';

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[800px] p-0 overflow-hidden border-none shadow-2xl">
				<DialogHeader className="px-8 py-8 bg-card border-b relative">
					<div className="absolute top-0 right-0 p-8 opacity-5">
						<History className="h-24 w-24" />
					</div>
					<div className="flex items-center gap-4 mb-4">
						<Badge variant="secondary" className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white border-none ${actionColor}`}>
							{audit.Action}
						</Badge>
						<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">Log #{audit.ID}</span>
					</div>
					<DialogTitle className="text-3xl font-black italic uppercase tracking-tighter leading-none">
						Audit Detail
					</DialogTitle>
					<DialogDescription className="text-muted-foreground font-medium mt-2">
						Complete cryptographic trace of data mutation and system access.
					</DialogDescription>
				</DialogHeader>

				<div className="p-0 bg-background">
					<div className="grid grid-cols-2 md:grid-cols-4 border-b">
						<div className="p-6 border-r flex flex-col gap-2">
							<div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5 leading-none">
								<User className="h-3 w-3" /> Actor
							</div>
							<div className="text-sm font-bold truncate leading-tight">{audit.user?.FullName || "System"}</div>
						</div>
						<div className="p-6 border-r flex flex-col gap-2">
							<div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5 leading-none">
								<Database className="h-3 w-3" /> Target
							</div>
							<div className="text-sm font-bold truncate leading-tight uppercase tracking-tight">{audit.TableEdited}</div>
						</div>
						<div className="p-6 border-r flex flex-col gap-2 bg-muted/20">
							<div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5 leading-none">
								<Globe className="h-3 w-3" /> Source
							</div>
							<div className="text-sm font-bold truncate leading-tight">{audit.Source || "Application"}</div>
						</div>
						<div className="p-6 flex flex-col gap-2">
							<div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5 leading-none">
								<Calendar className="h-3 w-3" /> Timestamp
							</div>
							<div className="text-xs font-bold leading-tight line-clamp-2">{new Date(audit.DateAdded).toLocaleString()}</div>
						</div>
					</div>

					<div className="p-8">
						<div className="mb-6">
							<h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-4">
								<Activity className="h-3 w-3" /> Operation Summary
							</h4>
							<div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 text-sm font-bold italic text-slate-700 leading-relaxed shadow-inner">
								{audit.ReadableChanges || "Generic state mutation detected."}
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
							<div className="space-y-4">
								<h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
									<FileCode className="h-3 w-3" /> Pre-Mutation State
								</h4>
								<div className="rounded-2xl border-2 border-slate-100 bg-slate-50/50 overflow-hidden">
									<ScrollArea className="h-[200px] p-4 font-mono text-[10px]">
										{previousChanges ? (
											Object.entries(previousChanges).map(([key, val]) => (
												<div key={key} className="mb-2 last:mb-0 pb-2 border-b border-slate-200/50 last:border-0">
													<span className="text-slate-400 font-black">{key}:</span> <span className="text-slate-900 font-bold">{String(val)}</span>
												</div>
											))
										) : (
											<div className="flex items-center justify-center h-full text-slate-300 italic">Initial creation / No historical state</div>
										)}
									</ScrollArea>
								</div>
							</div>

							<div className="space-y-4">
								<h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
									<Diff className="h-3 w-3" /> Post-Mutation State
								</h4>
								<div className="rounded-2xl border-2 border-primary/10 bg-primary/5 overflow-hidden">
									<ScrollArea className="h-[200px] p-4 font-mono text-[10px]">
										{savedChanges ? (
											Object.entries(savedChanges).map(([key, val]) => (
												<div key={key} className="mb-2 last:mb-0 pb-2 border-b border-primary/10 last:border-0">
													<span className="text-primary font-black">{key}:</span> <span className="text-slate-900 font-bold">{String(val)}</span>
												</div>
											))
										) : (
											<div className="flex items-center justify-center h-full text-slate-300 italic">Deletion / End of lifecycle</div>
										)}
									</ScrollArea>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="p-8 bg-card border-t flex justify-end">
					<Button variant="outline" onClick={() => onOpenChange(false)} className="px-12 h-12 font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-sm border-2">
						Dismiss Entry
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
