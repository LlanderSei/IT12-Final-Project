import React, { useEffect, useMemo, useState } from "react";
import { Head, useForm } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import CashierTabs from "./CashierTabs";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { 
	Select, 
	SelectContent, 
	SelectItem, 
	SelectTrigger, 
	SelectValue 
} from "@/Components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/Components/ui/dialog";
import { Label } from "@/Components/ui/label";
import PageHeader from "@/Components/PageHeader";
import DataTable from "@/Components/DataTable";
import StatusBadge from "@/Components/StatusBadge";
import ConfirmationModal from "@/Components/ConfirmationModal";
import { Search, UserPlus, Trash2, Edit2, Eye, RotateCcw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import usePermissions from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

const currency = (value) => `P${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "-";
	return parsed.toLocaleString();
};

export default function Customers({ customers = [] }) {
	const { can, requirePermission } = usePermissions();
	const canCreateCustomer = can("CanCreateCustomer");
	const canUpdateCustomer = can("CanUpdateCustomer");
	const canDeleteCustomer = can("CanDeleteCustomer");

	const [searchQuery, setSearchQuery] = useState("");
	const [customerTypeFilter, setCustomerTypeFilter] = useState("all");
	const [sortConfig, setSortConfig] = useState({ key: "CustomerName", direction: "asc" });
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(25);
	const [selectedCustomer, setSelectedCustomer] = useState(null);
	const [isFormModalOpen, setIsFormModalOpen] = useState(false);
	const [editingCustomer, setEditingCustomer] = useState(null);
	const [customerToDelete, setCustomerToDelete] = useState(null);

	const customerForm = useForm({
		CustomerName: "",
		CustomerType: "Retail",
		ContactDetails: "",
		Address: "",
	});

	const customerTypeOptions = useMemo(
		() => [...new Set((customers || []).map((c) => c.CustomerType).filter(Boolean))],
		[customers]
	);

	const filteredCustomers = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		const items = [...(customers || [])].filter((customer) => {
			if (customerTypeFilter !== "all" && customer.CustomerType !== customerTypeFilter) return false;
			if (!query) return true;
			return [
				customer.ID,
				customer.CustomerName,
				customer.CustomerType,
				customer.ContactDetails,
				customer.Address,
			]
				.join(" ")
				.toLowerCase()
				.includes(query);
		});

		return items.sort((a, b) => {
			const getValue = (record) => {
				if (sortConfig.key === "ID") return Number(record.ID || 0);
				if (sortConfig.key === "SalesRecords") return Number(record.SalesRecords || 0);
				if (sortConfig.key === "DateAdded" || sortConfig.key === "DateModified") {
					return record[sortConfig.key] ? new Date(record[sortConfig.key]).getTime() : 0;
				}
				return String(record[sortConfig.key] || "").toLowerCase();
			};

			const aValue = getValue(a);
			const bValue = getValue(b);
			if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
			if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
			return 0;
		});
	}, [customers, customerTypeFilter, searchQuery, sortConfig]);

	useEffect(() => setCurrentPage(1), [searchQuery, customerTypeFilter, sortConfig, itemsPerPage]);

	const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / itemsPerPage));
	const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

	const closeFormModal = () => {
		setIsFormModalOpen(false);
		setEditingCustomer(null);
		customerForm.reset();
		customerForm.clearErrors();
	};

	const openAddModal = () => {
		if (!canCreateCustomer) return requirePermission("CanCreateCustomer");
		setEditingCustomer(null);
		customerForm.reset();
		setIsFormModalOpen(true);
	};

	const openEditModal = (customer) => {
		if (!canUpdateCustomer) return requirePermission("CanUpdateCustomer");
		setEditingCustomer(customer);
		customerForm.setData({
			CustomerName: customer.CustomerName || "",
			CustomerType: customer.CustomerType || "Retail",
			ContactDetails: customer.ContactDetails || "",
			Address: customer.Address || "",
		});
		setIsFormModalOpen(true);
	};

	const submitCustomer = (e) => {
		e.preventDefault();
		const action = editingCustomer ? "put" : "post";
		const url = editingCustomer ? route("pos.customers.update", editingCustomer.ID) : route("pos.customers.store");
		
		customerForm[action](url, {
			preserveScroll: true,
			onSuccess: () => closeFormModal(),
		});
	};

	const columns = [
		{ 
			header: "ID", 
			accessorKey: "ID",
			className: "w-[80px]"
		},
		{ 
			header: "Customer Name", 
			accessorKey: "CustomerName",
			className: "font-medium"
		},
		{ 
			header: "Type", 
			cell: (row) => <StatusBadge status={row.CustomerType} type="customer" />
		},
		{ header: "Contact", accessorKey: "ContactDetails" },
		{ 
			header: "Sales", 
			accessorKey: "SalesRecords",
			className: "text-right pr-6"
		},
		{
			header: "Actions",
			className: "text-right",
			cell: (row) => (
				<div className="flex justify-end gap-2">
					<Button variant="ghost" size="icon" onClick={() => setSelectedCustomer(row)}>
						<Eye className="h-4 w-4" />
					</Button>
					<Button 
						variant="ghost" 
						size="icon" 
						onClick={() => openEditModal(row)}
						disabled={!canUpdateCustomer}
					>
						<Edit2 className="h-4 w-4" />
					</Button>
					<Button 
						variant="ghost" 
						size="icon" 
						className="text-destructive hover:text-destructive hover:bg-destructive/10"
						onClick={() => setCustomerToDelete(row)}
						disabled={!canDeleteCustomer || Number(row.SalesRecords || 0) > 0}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			)
		}
	];

	return (
		<AuthenticatedLayout disableScroll={true}>
			<Head title="Customers" />
			<PageHeader 
				title="Customers" 
				description="Manage your customer database and track sales history."
				actions={
					<Button onClick={openAddModal} disabled={!canCreateCustomer}>
						<UserPlus className="mr-2 h-4 w-4" />
						Add Customer
					</Button>
				}
			/>
			<CashierTabs />

			<div className="flex-1 flex flex-col p-6 space-y-4 overflow-hidden">
				<div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input 
							placeholder="Search customers..." 
							className="pl-9"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
					<Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="All Types" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Types</SelectItem>
							{customerTypeOptions.map(type => (
								<SelectItem key={type} value={type}>{type}</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button variant="outline" size="icon" onClick={() => { setSearchQuery(""); setCustomerTypeFilter("all"); }}>
						<RotateCcw className="h-4 w-4" />
					</Button>
				</div>

				<div className="flex-1 overflow-auto rounded-md border bg-card">
					<DataTable 
						columns={columns} 
						data={paginatedCustomers} 
						emptyMessage="No customers found matching your criteria."
					/>
				</div>

				<div className="flex items-center justify-between">
					<p className="text-sm text-muted-foreground">
						Showing {Math.min(filteredCustomers.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredCustomers.length, currentPage * itemsPerPage)} of {filteredCustomers.length} customers
					</p>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
							<ChevronsLeft className="h-4 w-4" />
						</Button>
						<Button variant="outline" size="icon" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<span className="text-sm font-medium px-4">Page {currentPage} of {totalPages}</span>
						<Button variant="outline" size="icon" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
							<ChevronRight className="h-4 w-4" />
						</Button>
						<Button variant="outline" size="icon" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
							<ChevronsRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>

			{/* Form Dialog */}
			<Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
				<DialogContent className="sm:max-w-[500px]">
					<form onSubmit={submitCustomer}>
						<DialogHeader>
							<DialogTitle>{editingCustomer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
							<DialogDescription>Fill in the details below to {editingCustomer ? "update" : "create"} a customer record.</DialogDescription>
						</DialogHeader>
						<div className="grid gap-4 py-4">
							<div className="grid gap-2">
								<Label htmlFor="CustomerName">Full Name</Label>
								<Input id="CustomerName" value={customerForm.data.CustomerName} onChange={e => customerForm.setData("CustomerName", e.target.value)} />
								{customerForm.errors.CustomerName && <p className="text-xs text-destructive">{customerForm.errors.CustomerName}</p>}
							</div>
							<div className="grid gap-2">
								<Label htmlFor="CustomerType">Customer Type</Label>
								<Select value={customerForm.data.CustomerType} onValueChange={v => customerForm.setData("CustomerType", v)}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Retail">Retail</SelectItem>
										<SelectItem value="Business">Business</SelectItem>
									</SelectContent>
								</Select>
								{customerForm.errors.CustomerType && <p className="text-xs text-destructive">{customerForm.errors.CustomerType}</p>}
							</div>
							<div className="grid gap-2">
								<Label htmlFor="ContactDetails">Contact Details</Label>
								<Input id="ContactDetails" value={customerForm.data.ContactDetails} onChange={e => customerForm.setData("ContactDetails", e.target.value)} />
								{customerForm.errors.ContactDetails && <p className="text-xs text-destructive">{customerForm.errors.ContactDetails}</p>}
							</div>
							<div className="grid gap-2">
								<Label htmlFor="Address">Address</Label>
								<textarea 
									id="Address" 
									className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
									value={customerForm.data.Address} 
									onChange={e => customerForm.setData("Address", e.target.value)} 
								/>
								{customerForm.errors.Address && <p className="text-xs text-destructive">{customerForm.errors.Address}</p>}
							</div>
						</div>
						<DialogFooter>
							<Button type="button" variant="outline" onClick={closeFormModal}>Cancel</Button>
							<Button type="submit" disabled={customerForm.processing}>{editingCustomer ? "Save Changes" : "Add Customer"}</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Details Dialog */}
			<Dialog open={Boolean(selectedCustomer)} onOpenChange={() => setSelectedCustomer(null)}>
				<DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden">
					<DialogHeader>
						<DialogTitle>Customer Details</DialogTitle>
						<DialogDescription>Overview and sales history for {selectedCustomer?.CustomerName}.</DialogDescription>
					</DialogHeader>
					{selectedCustomer && (
						<div className="flex-1 overflow-y-auto pr-2 space-y-6 py-4">
							<div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-lg">
								<div className="grid gap-1">
									<Label className="text-muted-foreground">Name</Label>
									<p className="font-medium">{selectedCustomer.CustomerName}</p>
								</div>
								<div className="grid gap-1">
									<Label className="text-muted-foreground">Type</Label>
									<StatusBadge status={selectedCustomer.CustomerType} type="customer" />
								</div>
								<div className="grid gap-1">
									<Label className="text-muted-foreground">Contact</Label>
									<p>{selectedCustomer.ContactDetails || "-"}</p>
								</div>
								<div className="grid gap-1">
									<Label className="text-muted-foreground">Total Sales</Label>
									<p className="font-bold">{selectedCustomer.SalesRecords}</p>
								</div>
								<div className="col-span-2 grid gap-1">
									<Label className="text-muted-foreground">Address</Label>
									<p>{selectedCustomer.Address || "-"}</p>
								</div>
							</div>

							<div className="space-y-3">
								<h4 className="font-semibold flex items-center gap-2">Sales History</h4>
								<div className="rounded-md border overflow-hidden">
									<table className="min-w-full text-sm">
										<thead className="bg-muted/50">
											<tr>
												<th className="px-4 py-2 text-left font-medium">Sale ID</th>
												<th className="px-4 py-2 text-left font-medium">Date</th>
												<th className="px-4 py-2 text-right font-medium">Total</th>
												<th className="px-4 py-2 text-center font-medium">Status</th>
											</tr>
										</thead>
										<tbody className="divide-y">
											{(selectedCustomer.sales || []).map(sale => (
												<tr key={sale.ID} className="hover:bg-muted/30">
													<td className="px-4 py-2 font-mono text-xs">#{sale.ID}</td>
													<td className="px-4 py-2 text-muted-foreground">{formatDateTime(sale.DateAdded)}</td>
													<td className="px-4 py-2 text-right font-semibold">{currency(sale.totalAmount)}</td>
													<td className="px-4 py-2 text-center">
														<StatusBadge status={sale.payment?.PaymentStatus} type="payment" />
													</td>
												</tr>
											))}
											{(selectedCustomer.sales || []).length === 0 && (
												<tr>
													<td colSpan="4" className="px-4 py-8 text-center text-muted-foreground">No sales history found.</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					)}
					<DialogFooter>
						<Button variant="outline" onClick={() => setSelectedCustomer(null)}>Close</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<ConfirmationModal 
				show={Boolean(customerToDelete)} 
				onClose={() => setCustomerToDelete(null)} 
				onConfirm={() => {
					customerForm.delete(route("pos.customers.destroy", customerToDelete.ID), {
						onSuccess: () => setCustomerToDelete(null)
					});
				}}
				title="Delete Customer"
				message={`Are you sure you want to delete "${customerToDelete?.CustomerName}"? This action cannot be undone.`}
				confirmText="Delete"
				processing={customerForm.processing}
			/>
		</AuthenticatedLayout>
	);
}
