import React, { useMemo, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";
import DataTable from "@/Components/DataTable";
import PageHeader from "@/Components/PageHeader";
import { 
	Search, 
	RotateCcw, 
	Eye, 
	History,
	Database,
	User as UserIcon,
	ShieldAlert,
	Calendar as CalendarIcon,
	Filter
} from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { 
	Select, 
	SelectContent, 
	SelectItem, 
	SelectTrigger, 
	SelectValue 
} from "@/Components/ui/select";
import { Badge } from "@/Components/ui/badge";
import AuditDetailDialog from "./Partials/AuditDetailDialog";

export default function Audits({ audits = [] }) {
	const [searchQuery, setSearchQuery] = useState("");
	const [actionFilter, setActionFilter] = useState("all");
	const [tableFilter, setTableFilter] = useState("all");
	const [selectedAudit, setSelectedAudit] = useState(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);

	const actionOptions = useMemo(
		() => [...new Set(audits.map((a) => a.Action).filter(Boolean))].sort(),
		[audits]
	);

	const tableOptions = useMemo(
		() => [...new Set(audits.map((a) => a.TableEdited).filter(Boolean))].sort(),
		[audits]
	);

	const filteredAudits = useMemo(() => {
		let items = [...(audits || [])];
		const query = searchQuery.toLowerCase().trim();

		if (query) {
			items = items.filter(a => 
				a.ID.toString().includes(query) ||
				a.user?.FullName?.toLowerCase().includes(query) ||
				a.TableEdited?.toLowerCase().includes(query) ||
				a.Action?.toLowerCase().includes(query) ||
				a.ReadableChanges?.toLowerCase().includes(query)
			);
		}

		if (actionFilter !== "all") items = items.filter(a => a.Action === actionFilter);
		if (tableFilter !== "all") items = items.filter(a => a.TableEdited === tableFilter);

		return items;
	}, [audits, searchQuery, actionFilter, tableFilter]);

	const columns = [
		{
			header: "Audit ID",
			accessorKey: "ID",
			cell: (row) => (
				<div className="flex items-center gap-4 py-1">
					<div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 border-2 border-dashed">
						<History className="h-5 w-5" />
					</div>
					<div>
						<div className="font-black text-[10px] uppercase tracking-widest text-slate-400 opacity-50 mb-0.5">Sequence ID</div>
						<div className="font-bold text-slate-900">EV-{row.ID}</div>
					</div>
				</div>
			),
			sortable: true
		},
		{
			header: "Actor",
			accessorKey: "user.FullName",
			cell: (row) => (
				<div className="flex items-center gap-3">
					<div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
						<UserIcon className="h-4 w-4" />
					</div>
					<div className="font-bold text-sm uppercase tracking-tight">{row.user?.FullName || "System Agent"}</div>
				</div>
			),
			sortable: true
		},
		{
			header: "Operation",
			accessorKey: "Action",
			cell: (row) => {
				const color = {
					'Created': 'bg-emerald-50 text-emerald-600 border-emerald-500/20',
					'Create': 'bg-emerald-50 text-emerald-600 border-emerald-500/20',
					'Add': 'bg-emerald-50 text-emerald-600 border-emerald-500/20',
					'Deleted': 'bg-destructive/10 text-destructive border-destructive/20',
					'Delete': 'bg-destructive/10 text-destructive border-destructive/20',
				}[row.Action] || 'bg-blue-50 text-blue-600 border-blue-500/20';

				return (
					<Badge variant="outline" className={`font-black text-[10px] uppercase tracking-widest px-3 border-2 h-7 ${color}`}>
						{row.Action}
					</Badge>
				);
			},
			sortable: true
		},
		{
			header: "Target Entity",
			accessorKey: "TableEdited",
			cell: (row) => (
				<div className="flex items-center gap-2">
					<Database className="h-3 w-3 text-slate-300" />
					<span className="text-sm font-black text-slate-600 uppercase tracking-tighter">{row.TableEdited}</span>
				</div>
			),
			sortable: true
		},
		{
			header: "Execution Date",
			accessorKey: "DateAdded",
			cell: (row) => (
				<div className="flex flex-col">
					<div className="text-sm font-bold text-slate-900">{new Date(row.DateAdded).toLocaleDateString()}</div>
					<div className="text-[10px] font-black uppercase text-slate-400 opacity-50 mt-1">{new Date(row.DateAdded).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
				</div>
			),
			sortable: true
		},
		{
			header: "Actions",
			id: "actions",
			cell: (row) => (
				<div className="flex items-center justify-end">
					<Button 
						variant="ghost" 
						size="icon"
						className="h-10 w-10 text-muted-foreground hover:text-foreground bg-card hover:bg-slate-100 rounded-xl transition-all"
						onClick={() => { setSelectedAudit(row); setIsDetailOpen(true); }}
					>
						<Eye className="h-4 w-4" />
					</Button>
				</div>
			)
		}
	];

	return (
		<AuthenticatedLayout disableScroll={true}>
			<Head title="Audit History | Momma's Bakeshop" />

			<div className="flex flex-col h-full bg-slate-50/50">
				<PageHeader 
					title="System Audits" 
					subtitle="Digital Archive"
					count={filteredAudits.length === audits.length ? `${audits.length} Records` : `${filteredAudits.length} of ${audits.length}`}
					actions={
						<div className="flex items-center gap-3">
							<span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50 mr-4 italic">Immutable Operations Log</span>
						</div>
					}
				/>

				<main className="flex-1 overflow-hidden p-10 pt-6">
					<div className="bg-white rounded-[2.5rem] border shadow-2xl shadow-slate-200/50 h-full flex flex-col overflow-hidden relative p-8">
						<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-200 via-slate-400 to-slate-200" />
						
						<div className="flex flex-col md:flex-row gap-4 mb-8">
							<div className="relative flex-1 max-w-md">
								<Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
								<Input 
									placeholder="Search audit signatures..." 
									className="pl-11 h-12 bg-muted/20 border-transparent focus-visible:ring-primary font-medium rounded-2xl"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
								/>
							</div>
							<div className="flex items-center gap-2 bg-muted/40 p-2 rounded-2xl border shadow-inner">
								<Select value={actionFilter} onValueChange={setActionFilter}>
									<SelectTrigger className="w-40 border-none bg-transparent h-8 font-black text-[10px] uppercase tracking-widest">
										<SelectValue placeholder="All Actions" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">Every Action</SelectItem>
										{actionOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
									</SelectContent>
								</Select>
								<Separator orientation="vertical" className="h-4 bg-slate-300 mx-1" />
								<Select value={tableFilter} onValueChange={setTableFilter}>
									<SelectTrigger className="w-44 border-none bg-transparent h-8 font-black text-[10px] uppercase tracking-widest">
										<SelectValue placeholder="All Entities" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">Every Entity</SelectItem>
										{tableOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
									</SelectContent>
								</Select>
								<Button 
									variant="ghost" 
									size="icon" 
									className="h-8 w-8 text-muted-foreground hover:text-primary transition-all rounded-lg"
									onClick={() => { setSearchQuery(""); setActionFilter("all"); setTableFilter("all"); }}
								>
									<RotateCcw className="h-4 w-4" />
								</Button>
							</div>
						</div>

						<DataTable 
							columns={columns} 
							data={filteredAudits} 
							pagination={true} 
							itemsPerPage={25}
						/>
					</div>
				</main>
			</div>

			<AuditDetailDialog 
				open={isDetailOpen}
				onOpenChange={setIsDetailOpen}
				audit={selectedAudit}
			/>
		</AuthenticatedLayout>
	);
}
