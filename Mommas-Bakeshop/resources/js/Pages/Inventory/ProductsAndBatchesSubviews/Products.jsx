import React, { useMemo, useState, useEffect } from "react";
import { useForm } from "@inertiajs/react";
import DataTable from "@/Components/DataTable";
import StatusBadge from "@/Components/StatusBadge";
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
	Search, 
	Plus, 
	RotateCcw, 
	Edit2, 
	Image as ImageIcon,
} from "lucide-react";
import { Badge } from "@/Components/ui/badge";
import { 
	clearPendingProductsBatchesFooterAction, 
	getPendingProductsBatchesFooterAction, 
	PRODUCTS_BATCHES_FOOTER_ACTIONS 
} from "@/utils/productsAndBatchesFooterActions";
import usePermissions from "@/hooks/usePermissions";
import ProductFormModal from "./Partials/ProductFormModal";
import CategoryManagementModal from "./Partials/CategoryManagementModal";
import ConfirmationModal from "@/Components/ConfirmationModal";
import { Separator } from "@/Components/ui/separator";

export default function Products({
	products,
	categories,
	onHeaderMetaChange,
	setFooterActions,
	canCreateProduct = false,
	canUpdateProduct = false,
	canDeleteProduct = false,
	canCreateProductCategory = false,
	canUpdateProductCategory = false,
	canDeleteProductCategory = false,
}) {
	const { requirePermission } = usePermissions();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [isCategoryDeleteModalOpen, setIsCategoryDeleteModalOpen] = useState(false);
	
	const [editingProduct, setEditingProduct] = useState(null);
	const [editingCategory, setEditingCategory] = useState(null);
	const [categoryToDelete, setCategoryToDelete] = useState(null);
	
	const [searchQuery, setSearchQuery] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("all");
	const [productFromFilter, setProductFromFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	
	const [imageInputKey, setImageInputKey] = useState(0);
	const [selectedImagePreview, setSelectedImagePreview] = useState(null);
	const [existingImageUrl, setExistingImageUrl] = useState(null);
	const [clientImageError, setClientImageError] = useState("");
	const maxImageBytes = 2 * 1024 * 1024;

	// Forms
	const productForm = useForm({
		ProductName: "",
		ProductDescription: "",
		CategoryID: "",
		Price: "",
		ProductImage: null,
		RemoveProductImage: false,
		LowStockThreshold: 10,
	});

	const categoryForm = useForm({
		CategoryName: "",
		CategoryDescription: "",
	});

	// Filters
	const categoryOptions = useMemo(() => 
		[...new Set((products || []).map(p => p.category?.CategoryName).filter(Boolean))],
	[products]);

	const productFromOptions = useMemo(() => 
		[...new Set((products || []).map(p => p.ProductFrom).filter(Boolean))],
	[products]);

	const getStatus = (product) => {
		if (product.Quantity == 0) return "No Stock";
		if (product.Quantity <= product.LowStockThreshold) return "Low Stock";
		return "On Stock";
	};

	const filteredProducts = useMemo(() => {
		let items = [...(products || [])];
		const query = searchQuery.toLowerCase().trim();
		
		if (query) {
			items = items.filter(p => 
				p.ProductName.toLowerCase().includes(query) ||
				p.category?.CategoryName?.toLowerCase().includes(query) ||
				p.ProductFrom?.toLowerCase().includes(query)
			);
		}
		if (categoryFilter !== "all") items = items.filter(p => p.category?.CategoryName === categoryFilter);
		if (productFromFilter !== "all") items = items.filter(p => p.ProductFrom === productFromFilter);
		if (statusFilter !== "all") {
			items = items.filter(p => {
				const s = getStatus(p);
				if (statusFilter === "on_stock") return s === "On Stock";
				if (statusFilter === "low_stock") return s === "Low Stock";
				if (statusFilter === "no_stock") return s === "No Stock";
				return true;
			});
		}
		return items;
	}, [products, searchQuery, categoryFilter, productFromFilter, statusFilter]);

	// Handlers
	const openAddModal = () => {
		if (!canCreateProduct) return requirePermission("CanCreateProduct");
		setEditingProduct(null);
		productForm.reset();
		setSelectedImagePreview(null);
		setExistingImageUrl(null);
		setClientImageError("");
		setImageInputKey((prev) => prev + 1);
		setIsModalOpen(true);
	};

	const openEditModal = (product) => {
		if (!canUpdateProduct) return requirePermission("CanUpdateProduct");
		setEditingProduct(product);
		productForm.setData({
			ProductName: product.ProductName,
			ProductDescription: product.ProductDescription || "",
			CategoryID: product.CategoryID,
			Price: product.Price,
			ProductImage: null,
			RemoveProductImage: false,
			LowStockThreshold: product.LowStockThreshold ?? 10,
		});
		setSelectedImagePreview(null);
		setExistingImageUrl(product.ProductImageUrl || null);
		setClientImageError("");
		setImageInputKey((prev) => prev + 1);
		setIsModalOpen(true);
	};

	const handleImageSelection = (e) => {
		const file = e.target.files?.[0] || null;
		if (file && file.size > maxImageBytes) {
			setClientImageError("Image must be 2MB or smaller.");
			productForm.setData("ProductImage", null);
			productForm.setData("RemoveProductImage", false);
			setSelectedImagePreview(null);
			setImageInputKey((prev) => prev + 1);
			return;
		}
		productForm.setData("ProductImage", file);
		productForm.setData("RemoveProductImage", false);
		setClientImageError("");
		if (file) {
			setSelectedImagePreview(URL.createObjectURL(file));
			setExistingImageUrl(null);
		}
		setImageInputKey(prev => prev + 1);
	};

	const removeSelectedImage = () => {
		productForm.setData("ProductImage", null);
		setSelectedImagePreview(null);
		setClientImageError("");
		if (existingImageUrl) {
			productForm.setData("RemoveProductImage", true);
			setExistingImageUrl(null);
		}
		setImageInputKey(prev => prev + 1);
	};

	const submitProduct = (e) => {
		e.preventDefault();
		const options = {
			forceFormData: true,
			onSuccess: () => setIsModalOpen(false)
		};
		if (editingProduct) {
			productForm.transform((data) => ({ ...data, _method: "put" }));
			productForm.post(route("inventory.products.update", editingProduct.ID), options);
		} else {
			productForm.post(route("inventory.products.store"), options);
		}
	};

	const openCategoryManager = () => {
		if (!canUpdateProductCategory) return requirePermission("CanUpdateProductCategory");
		setIsCategoryModalOpen(true);
	};

	const submitCategory = (e) => {
		e.preventDefault();
		const options = { preserveScroll: true, onSuccess: () => { categoryForm.reset(); setEditingCategory(null); } };
		if (editingCategory) categoryForm.put(route("inventory.categories.update", editingCategory.ID), options);
		else categoryForm.post(route("inventory.categories.store"), options);
	};

	const deleteCategory = (cat) => {
		if (!canDeleteProductCategory) return requirePermission("CanDeleteProductCategory");
		setCategoryToDelete(cat);
		setIsCategoryDeleteModalOpen(true);
	};

	// Columns
	const columns = [
		{
			header: "Product Detail",
			accessorKey: "ProductName",
			cell: ({ row }) => {
				const p = row.original;
				return (
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden border">
							{p.ProductImageUrl ? (
								<img src={p.ProductImageUrl} alt="" className="h-full w-full object-cover" />
							) : (
								<ImageIcon className="h-5 w-5 text-muted-foreground/50" />
							)}
						</div>
						<div>
							<div className="font-bold text-gray-900">{p.ProductName}</div>
							<div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
								{p.category?.CategoryName || "Uncategorized"}
							</div>
						</div>
					</div>
				);
			},
			sortable: true
		},
		{
			header: "Source",
			accessorKey: "ProductFrom",
			cell: ({ row }) => <Badge variant="secondary" className="font-bold uppercase text-[10px]">{row.original.ProductFrom || "N/A"}</Badge>,
			sortable: true
		},
		{
			header: "Unit Price",
			accessorKey: "Price",
			cell: ({ row }) => <div className="font-black text-primary">₱{Number(row.original.Price).toFixed(2)}</div>,
			sortable: true,
			className: "text-right"
		},
		{
			header: "Inventory",
			accessorKey: "Quantity",
			cell: ({ row }) => {
				const p = row.original;
				return (
					<div>
						<div className="font-bold">{p.Quantity} units</div>
						<div className="text-[10px] text-muted-foreground font-medium italic">Min: {p.LowStockThreshold ?? 10}</div>
					</div>
				);
			},
			sortable: true
		},
		{
			header: "Status",
			id: "status",
			cell: ({ row }) => <StatusBadge status={getStatus(row.original)} />,
			sortable: true
		},
		{
			header: "Actions",
			id: "actions",
			cell: ({ row }) => (
				<Button 
					variant="ghost" 
					size="icon" 
					className="h-8 w-8 text-primary hover:text-primary-hover hover:bg-primary-soft"
					onClick={() => openEditModal(row.original)}
					disabled={!canUpdateProduct}
				>
					<Edit2 className="h-4 w-4" />
				</Button>
			),
			className: "text-right"
		}
	];

	// Effects
	useEffect(() => {
		onHeaderMetaChange?.({ subtitle: "Finished Goods", countLabel: `${filteredProducts.length} Products` });
	}, [filteredProducts.length]);

	useEffect(() => {
		setFooterActions?.({ openAddProduct: openAddModal, openModifyCategories: openCategoryManager });
		return () => setFooterActions?.({ openAddProduct: null, openModifyCategories: null });
	}, [canCreateProduct, canUpdateProductCategory]);

	useEffect(() => {
		const action = getPendingProductsBatchesFooterAction();
		if (action === PRODUCTS_BATCHES_FOOTER_ACTIONS.ADD_PRODUCT) {
			clearPendingProductsBatchesFooterAction(); openAddModal();
		} else if (action === PRODUCTS_BATCHES_FOOTER_ACTIONS.MODIFY_CATEGORIES) {
			clearPendingProductsBatchesFooterAction(); openCategoryManager();
		}
	}, []);

	return (
		<div className="flex flex-col flex-1 overflow-hidden min-h-0">
			<div className="flex flex-col md:flex-row gap-4 mb-6">
				<div className="relative flex-1 max-w-md">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input 
						placeholder="Search products..." 
						className="pl-9 h-11"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
				<div className="flex flex-wrap gap-2 items-center">
					<div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-xl border">
						<Select value={categoryFilter} onValueChange={setCategoryFilter}>
							<SelectTrigger className="w-40 border-none bg-transparent h-8 font-bold text-xs uppercase">
								<SelectValue placeholder="All Categories" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Every Category</SelectItem>
								{categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
							</SelectContent>
						</Select>
						<Separator orientation="vertical" className="h-4" />
						<Select value={productFromFilter} onValueChange={setProductFromFilter}>
							<SelectTrigger className="w-36 border-none bg-transparent h-8 font-bold text-xs uppercase">
								<SelectValue placeholder="All Sources" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Sources</SelectItem>
								{productFromOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
							</SelectContent>
						</Select>
						<Separator orientation="vertical" className="h-4" />
						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger className="w-32 border-none bg-transparent h-8 font-bold text-xs uppercase">
								<SelectValue placeholder="All Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="on_stock">In Stock</SelectItem>
								<SelectItem value="low_stock">Low Stock</SelectItem>
								<SelectItem value="no_stock">Sold Out</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<Button 
						variant="ghost" 
						size="icon" 
						className="h-10 w-10 text-muted-foreground hover:text-primary transition-colors"
						onClick={() => { setSearchQuery(""); setCategoryFilter("all"); setProductFromFilter("all"); setStatusFilter("all"); }}
					>
						<RotateCcw className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<DataTable 
				columns={columns} 
				data={filteredProducts} 
				pagination={true} 
				itemsPerPage={25}
			/>

			<ProductFormModal 
				open={isModalOpen} 
				onOpenChange={setIsModalOpen}
				data={productForm.data}
				setData={productForm.setData}
				processing={productForm.processing}
				errors={productForm.errors}
				onSubmit={submitProduct}
				onDelete={() => setIsDeleteModalOpen(true)}
				editingProduct={editingProduct}
				categories={categories}
				selectedImagePreview={selectedImagePreview}
				existingImageUrl={existingImageUrl}
				removeSelectedImage={removeSelectedImage}
				handleImageSelection={handleImageSelection}
				imageInputKey={imageInputKey}
				canDelete={canDeleteProduct}
			/>

			<CategoryManagementModal 
				open={isCategoryModalOpen}
				onOpenChange={setIsCategoryModalOpen}
				categories={categories}
				catData={categoryForm.data}
				setCatData={categoryForm.setData}
				catProcessing={categoryForm.processing}
				catErrors={categoryForm.errors}
				onSubmit={submitCategory}
				onEdit={(cat) => { setEditingCategory(cat); categoryForm.setData({ CategoryName: cat.CategoryName, CategoryDescription: cat.CategoryDescription || "" }); }}
				onDelete={deleteCategory}
				editingCategory={editingCategory}
				cancelEdit={() => { setEditingCategory(null); categoryForm.reset(); }}
				canCreate={canCreateProductCategory}
				canUpdate={canUpdateProductCategory}
				canDelete={canDeleteProductCategory}
			/>

			<ConfirmationModal 
				show={isDeleteModalOpen}
				onClose={() => setIsDeleteModalOpen(false)}
				onConfirm={() => productForm.delete(route("inventory.products.destroy", editingProduct.ID), { onSuccess: () => { setIsModalOpen(false); setIsDeleteModalOpen(false); } })}
				title="Delete Product"
				message={`Are you sure you want to delete "${editingProduct?.ProductName}"?`}
				confirmText="Delete"
				processing={productForm.processing}
				variant="danger"
			/>

			<ConfirmationModal 
				show={isCategoryDeleteModalOpen}
				onClose={() => setIsCategoryDeleteModalOpen(false)}
				onConfirm={() => categoryForm.delete(route("inventory.categories.destroy", categoryToDelete.ID), { onSuccess: () => setIsCategoryDeleteModalOpen(false) })}
				title="Delete Category"
				message={`Are you sure you want to delete "${categoryToDelete?.CategoryName}"?`}
				confirmText="Delete"
				processing={categoryForm.processing}
				variant="danger"
			/>
		</div>
	);
}
