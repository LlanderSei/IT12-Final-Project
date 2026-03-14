import React, { useState } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/Components/ui/table";
import EmptyState from "@/Components/EmptyState";
import { cn } from "@/lib/utils";
import { Button } from "@/Components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function DataTable({
	columns = [],
	data = [],
	emptyMessage = "No items found.",
	onRowClick,
	className,
	pagination = false,
	itemsPerPage = 10,
}) {
	const [currentPage, setCurrentPage] = useState(1);

	if (!data || data.length === 0) {
		return (
			<div className={cn("flex-1 flex items-center justify-center p-20", className)}>
				<EmptyState description={emptyMessage} />
			</div>
		);
	}

	const totalPages = pagination ? Math.ceil(data.length / itemsPerPage) : 1;
	const currentData = pagination 
		? data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
		: data;

	return (
		<div className={cn("flex-1 flex flex-col min-h-0", className)}>
			<div className="flex-1 overflow-auto rounded-3xl border-2 border-slate-50">
				<Table>
					<TableHeader className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm">
						<TableRow className="hover:bg-transparent border-b-2">
							{columns.map((column, index) => (
								<TableHead key={index} className={cn("h-14 font-black text-[10px] uppercase tracking-[0.2em] text-slate-500", column.className)}>
									{column.header}
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{currentData.map((row, rowIndex) => (
							<TableRow
								key={rowIndex}
								onClick={() => onRowClick && onRowClick(row)}
								className={cn("group hover:bg-slate-50/50 transition-colors border-b last:border-0", onRowClick && "cursor-pointer")}
							>
								{columns.map((column, colIndex) => (
									<TableCell key={colIndex} className={cn("py-4 px-4", column.className)}>
										{column.cell ? column.cell(row) : row[column.accessorKey]}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{pagination && totalPages > 1 && (
				<div className="flex items-center justify-between mt-6 px-2">
					<div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
						Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, data.length)} of {data.length} entries
					</div>
					<div className="flex items-center gap-2">
						<Button 
							variant="outline" 
							size="icon" 
							className="h-10 w-10 rounded-xl"
							onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
							disabled={currentPage === 1}
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<div className="flex items-center gap-1 font-black text-xs px-2">
							<span className="text-primary">{currentPage}</span>
							<span className="opacity-20">/</span>
							<span>{totalPages}</span>
						</div>
						<Button 
							variant="outline" 
							size="icon" 
							className="h-10 w-10 rounded-xl"
							onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
							disabled={currentPage === totalPages}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
