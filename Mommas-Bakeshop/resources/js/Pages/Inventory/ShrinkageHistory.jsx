import React, { useEffect, useMemo, useState } from "react";
import { Head, useForm } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import DataTable from "@/Components/DataTable";
import PageHeader from "@/Components/PageHeader";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { 
    Search, 
    RotateCcw, 
    TrendingDown, 
    ChevronRight, 
    History,
    Eye,
    ShieldCheck,
    Trash2,
} from "lucide-react";
import { Badge } from "@/Components/ui/badge";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/Components/ui/select";
import usePermissions from "@/hooks/usePermissions";
import ConfirmationModal from "@/Components/ConfirmationModal";
import ShrinkageFormModal from "./Partials/ShrinkageFormModal";
import ShrinkageDetailDialog from "./Partials/ShrinkageDetailDialog";

const currency = (value) => `₱${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const normalizeItems = (items = []) =>
	items.map((item) => ({
		ProductID: String(item.ProductID),
		Quantity: String(item.Quantity),
	}));

const buildGroupedQuantities = (items = [], excludeIndex = null) =>
	items.reduce((accumulator, item, index) => {
		if (index === excludeIndex) return accumulator;
		const productId = String(item.ProductID || "");
		const quantity = Number(item.Quantity || 0);
		if (!productId || quantity <= 0) return accumulator;
		accumulator[productId] = (accumulator[productId] || 0) + quantity;
		return accumulator;
	}, {});

const formatCountLabel = (count, label) => 
	`${count} ${label}${count !== 1 ? 's' : ''}`;

export default function ShrinkageHistory({
	shrinkages = [],
	products = [],
	allowedReasons = [],
}) {
	const { can, requirePermission } = usePermissions();
	const canCreateShrinkage = can("CanCreateShrinkageRecord");
	const canUpdateShrinkage = can("CanUpdateShrinkageRecord");
	const canDeleteShrinkage = can("CanDeleteShrinkageRecord");
	const canVerifyShrinkage = can("CanVerifyShrinkageRecord");

	const [searchQuery, setSearchQuery] = useState("");
	const [reasonFilter, setReasonFilter] = useState("all");
	const [selectedShrinkage, setSelectedShrinkage] = useState(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);
	const [isFormModalOpen, setIsFormModalOpen] = useState(false);
	const [editingShrinkage, setEditingShrinkage] = useState(null);
	const [shrinkageToDelete, setShrinkageToDelete] = useState(null);
	const [verifyTarget, setVerifyTarget] = useState(null);
	
	const [selectedProductId, setSelectedProductId] = useState("");
	const [selectedQuantity, setSelectedQuantity] = useState("1");
	const [formError, setFormError] = useState("");
	const [bypassVerification, setBypassVerification] = useState(false);
	const [showBypassConfirm, setShowBypassConfirm] = useState(false);

	const form = useForm({
		reason: allowedReasons[0] || "Spoiled",
		items: [],
	});

	const verifyForm = useForm({ status: "Verified" });

	const productsById = useMemo(() =>
		(products || []).reduce((acc, p) => { acc[String(p.ID)] = p; return acc; }, {}),
	[products]);

	const filterReasonOptions = useMemo(() => 
		[...new Set((shrinkages || []).map(i => i.Reason).filter(Boolean))],
	[shrinkages]);

	const getBaseAvailable = (productId) => Number(productsById[String(productId)]?.Quantity || 0);

	const getRemainingAllowance = (productId, excludeIndex = null) => {
		const grouped = buildGroupedQuantities(form.data.items || [], excludeIndex);
		return Math.max(0, getBaseAvailable(productId) - Number(grouped[String(productId)] || 0));
	};

	// Filters
	const filteredShrinkages = useMemo(() => {
		let items = [...(shrinkages || [])];
		const query = searchQuery.toLowerCase().trim();
		
		if (reasonFilter !== "all") {
			items = items.filter(s => s.Reason === reasonFilter);
		}

		if (query) {
			items = items.filter(s => 
				s.ID.toString().includes(query) ||
				s.CreatedBy?.toLowerCase().includes(query) ||
				s.Reason?.toLowerCase().includes(query) ||
				s.items?.some(i => i.ProductName?.toLowerCase().includes(query))
			);
		}
		
		return items;
	}, [shrinkages, searchQuery, reasonFilter]);

	const unconfirmedCount = useMemo(
		() => shrinkages.filter(s => !s.VerificationStatus || s.VerificationStatus === "Pending").length,
		[shrinkages]
	);

	// Handlers
	const addProductLine = () => {
		const pid = String(selectedProductId || "");
		const qty = Number(selectedQuantity || 0);
		if (!pid) return setFormError("Select a product to add.");
		if (!Number.isInteger(qty) || qty < 1) return setFormError("Quantity must be a positive whole number.");

		const allowance = getRemainingAllowance(pid);
		if (qty > allowance) return setFormError(`Quantity cannot exceed available stock (${allowance}).`);

		const current = [...(form.data.items || [])];
		const idx = current.findIndex(i => String(i.ProductID) === pid);
		if (idx >= 0) {
			current[idx].Quantity = String(Number(current[idx].Quantity) + qty);
		} else {
			current.push({ ProductID: pid, Quantity: String(qty) });
		}

		form.setData("items", current);
		setSelectedProductId("");
		setSelectedQuantity("1");
		setFormError("");
	};

	const removeLine = (index) => {
		const next = [...(form.data.items || [])];
		next.splice(index, 1);
		form.setData("items", next);
		setFormError("");
	};

	const adjustLineQuantity = (index, delta) => {
		const cur = Number(form.data.items[index]?.Quantity || 0);
		const next = cur + delta;
		if (next < 1) return setFormError("Quantity cannot go below 1. Remove the line instead.");
		
		const pid = form.data.items[index]?.ProductID;
		const allowance = getRemainingAllowance(pid, index);
		if (next > allowance) return setFormError(`Quantity cannot exceed available stock (${allowance}).`);

		const nextItems = [...(form.data.items || [])];
		nextItems[index].Quantity = String(next);
		form.setData("items", nextItems);
		setFormError("");
	};

	const submitFormPayload = (skipValidation) => {
		if (!skipValidation && (form.data.items.length === 0)) return setFormError("Add at least one item.");

		form.transform(data => ({
			...data,
			items: data.items.map(i => ({ ProductID: Number(i.ProductID), Quantity: Number(i.Quantity) })),
			...(!editingShrinkage && canVerifyShrinkage && bypassVerification ? { bypassVerification: true } : {})
		}));

		const opts = {
			preserveScroll: true,
			onSuccess: () => { setIsFormModalOpen(false); setEditingShrinkage(null); form.reset(); setFormError(""); },
			onError: (err) => setFormError(Object.values(err)[0] || "Failed to save record.")
		};

		if (editingShrinkage) {
			if (!canUpdateShrinkage) return requirePermission("CanUpdateShrinkageRecord");
			form.put(route("inventory.shrinkage-history.update", editingShrinkage.ID), opts);
		} else {
			if (!canCreateShrinkage) return requirePermission("CanCreateShrinkageRecord");
			form.post(route("inventory.shrinkage-history.store"), opts);
		}
	};

	const handleVerify = (status) => {
		if (!verifyTarget) return;
		verifyForm.setData("status", status);
		verifyForm.post(route("inventory.shrinkage-history.verify", verifyTarget.ID), {
			preserveScroll: true,
			onSuccess: () => setVerifyTarget(null)
		});
	};

	// Columns
	const columns = [
		{
			header: "Audit Log",
			accessorKey: "ID",
			cell: (row) => (
				<div className="flex items-center gap-4 py-1">
					<div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground/30 border-2 border-dashed">
						<History className="h-6 w-6" />
					</div>
					<div>
						<div className="font-black text-[10px] uppercase tracking-widest text-muted-foreground opacity-50 mb-1">Archive Entry</div>
						<div className="font-bold text-gray-900">Record #{row.ID}</div>
					</div>
				</div>
			),
			sortable: true
		},
		{
			header: "Impact",
			accessorKey: "TotalAmount",
			cell: (row) => (
				<div className="flex flex-col">
					<div className="font-black text-primary italic leading-none">{currency(row.TotalAmount)}</div>
					<div className="text-[10px] font-black uppercase text-muted-foreground opacity-30 mt-1">{row.Quantity} Items Lost</div>
				</div>
			),
			sortable: true
		},
		{
			header: "Reason",
			accessorKey: "Reason",
			cell: (row) => (
				<Badge variant="outline" className="font-black text-[10px] uppercase tracking-widest px-3 border-orange-500/20 text-orange-700 bg-orange-50 h-7 border-2">
					{row.Reason}
				</Badge>
			),
			sortable: true
		},
		{
			header: "Verification",
			accessorKey: "VerificationStatus",
			cell: (row) => {
				const isPending = !row.VerificationStatus || row.VerificationStatus === 'Pending';
				return (
					<div className="flex items-center gap-2">
						<div className={`h-2 w-2 rounded-full ${isPending ? 'bg-orange-500 animate-pulse' : row.VerificationStatus === 'Verified' ? 'bg-emerald-500' : 'bg-destructive'}`} />
						<span className="text-sm font-bold">{row.VerificationStatus || 'Pending'}</span>
					</div>
				);
			},
			sortable: true
		},
		{
			header: "Actions",
			id: "actions",
			cell: (row) => {
				const isPending = !row.VerificationStatus || row.VerificationStatus === 'Pending';
				return (
					<div className="flex items-center justify-end gap-2">
						<Button 
							variant="ghost" 
							size="icon"
							className="h-10 w-10 text-muted-foreground hover:text-foreground bg-card hover:bg-slate-100 rounded-xl"
							onClick={() => { setSelectedShrinkage(row); setIsDetailOpen(true); }}
						>
							<Eye className="h-4 w-4" />
						</Button>
						{isPending && canVerifyShrinkage && (
							<Button 
								variant="ghost" 
								size="icon"
								className="h-10 w-10 text-emerald-600 hover:text-white hover:bg-emerald-500 rounded-xl"
								onClick={() => setVerifyTarget(row)}
							>
								<ShieldCheck className="h-4 w-4" />
							</Button>
						)}
						{isPending && canUpdateShrinkage && (
							<Button 
								variant="ghost" 
								size="icon"
								className="h-10 w-10 text-primary hover:text-white hover:bg-primary rounded-xl"
								onClick={() => { setEditingShrinkage(row); form.setData({ reason: row.Reason, items: normalizeItems(row.items || []) }); setIsFormModalOpen(true); }}
							>
								<Plus className="h-4 w-4 rotate-45" />
							</Button>
						)}
						{isPending && canDeleteShrinkage && (
							<Button 
								variant="ghost" 
								size="icon"
								className="h-10 w-10 text-destructive hover:text-white hover:bg-destructive rounded-xl"
								onClick={() => setShrinkageToDelete(row)}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						)}
					</div>
				);
			}
		}
	];

	return (
		<AuthenticatedLayout disableScroll={true}>
			<Head title="Shrinkage History" />

			<div className="flex flex-col h-full bg-slate-50/50">
				<PageHeader 
					title="Inventory Shrinkage" 
					subtitle="Audit History"
					count={filteredShrinkages.length === shrinkages.length ? formatCountLabel(shrinkages.length, "Record") : `${filteredShrinkages.length} of ${shrinkages.length}`}
					actions={
						<Button 
							className="rounded-xl font-black uppercase tracking-widest text-[11px] h-12 px-8 gap-3 bg-foreground text-white shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
							onClick={() => { setEditingShrinkage(null); form.reset(); setIsFormModalOpen(true); }}
							disabled={!canCreateShrinkage}
						>
							<TrendingDown className="h-5 w-5" /> Record New Loss
						</Button>
					}
				>
					{unconfirmedCount > 0 && (
						<div className="bg-warning/10 text-warning-foreground px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
							{unconfirmedCount} Pending Verification
						</div>
					)}
				</PageHeader>

				<main className="flex-1 overflow-hidden p-10 pt-6">
					<div className="bg-white rounded-[2.5rem] border shadow-2xl shadow-slate-200/50 h-full flex flex-col overflow-hidden relative p-8">
						<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400 opacity-50" />
						
						<div className="flex flex-col md:flex-row gap-4 mb-8">
							<div className="relative flex-1 max-w-md">
								<Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
								<Input 
									placeholder="Search by ID, staff, or product..." 
									className="pl-11 h-12 bg-muted/20 border-transparent focus-visible:ring-primary font-medium rounded-2xl"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
								/>
							</div>
							<div className="flex items-center gap-2 bg-muted/40 p-2 rounded-2xl border shadow-inner">
								<Select value={reasonFilter} onValueChange={setReasonFilter}>
									<SelectTrigger className="w-44 border-none bg-transparent h-8 font-black text-[10px] uppercase tracking-widest">
										<SelectValue placeholder="All Reasons" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">Every Reason</SelectItem>
										{filterReasonOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
									</SelectContent>
								</Select>
								<Button 
									variant="ghost" 
									size="icon" 
									className="h-8 w-8 text-muted-foreground hover:text-primary transition-all rounded-lg"
									onClick={() => { setSearchQuery(""); setReasonFilter("all"); }}
								>
									<RotateCcw className="h-4 w-4" />
								</Button>
							</div>
						</div>

						<DataTable 
							columns={columns} 
							data={filteredShrinkages} 
							pagination={true} 
							itemsPerPage={25}
						/>
					</div>
				</main>
			</div>

			<ShrinkageFormModal 
				open={isFormModalOpen}
				onOpenChange={setIsFormModalOpen}
				form={form}
				products={products}
				allowedReasons={allowedReasons}
				editingShrinkage={editingShrinkage}
				onSubmit={(e) => { e.preventDefault(); if(!editingShrinkage && bypassVerification) { setShowBypassConfirm(true); } else { submitFormPayload(false); } }}
				processing={form.processing}
				onClose={() => setIsFormModalOpen(false)}
				formError={formError}
				setFormError={setFormError}
				selectedProductId={selectedProductId}
				setSelectedProductId={setSelectedProductId}
				selectedQuantity={selectedQuantity}
				setSelectedQuantity={setSelectedQuantity}
				bypassVerification={bypassVerification}
				setBypassVerification={setBypassVerification}
				canVerifyShrinkage={canVerifyShrinkage}
				addProductLine={addProductLine}
				removeLine={removeLine}
				adjustLineQuantity={adjustLineQuantity}
				productsById={productsById}
				getBaseAvailable={getBaseAvailable}
				getRemainingAllowance={getRemainingAllowance}
			/>

			<ShrinkageDetailDialog 
				open={isDetailOpen}
				onOpenChange={setIsDetailOpen}
				record={selectedShrinkage}
			/>

			<ConfirmationModal 
				show={showBypassConfirm}
				onClose={() => setShowBypassConfirm(false)}
				onConfirm={() => { setShowBypassConfirm(false); submitFormPayload(true); }}
				title="Confirm Auto-Verification"
				message="You are recording a shrinkage log with auto-verification. This will bypass the normal approval stage and immediately affect inventory stock levels. Proceed?"
				confirmText="Yes, Verify & Save"
				variant="warning"
			/>

			<ConfirmationModal 
				show={!!shrinkageToDelete}
				onClose={() => setShrinkageToDelete(null)}
				onConfirm={() => {
					form.delete(route("inventory.shrinkage-history.destroy", shrinkageToDelete.ID), {
						preserveScroll: true,
						onSuccess: () => setShrinkageToDelete(null)
					});
				}}
				title="Delete Shrinkage Record?"
				message="This action is permanent and will remove this audit trial entry. This should only be done for data entry errors."
				confirmText="Permanently Delete"
				variant="destructive"
			/>

			<ConfirmationModal 
				show={!!verifyTarget}
				onClose={() => setVerifyTarget(null)}
				onConfirm={() => handleVerify("Verified")}
				title="Verify Shrinkage Log?"
				message="Confirming this record will finalize the inventory impact and lock it from further editing. Ensure all quantities are correct."
				confirmText="Verify & Finalize"
				variant="warning"
			/>
		</AuthenticatedLayout>
	);
}
