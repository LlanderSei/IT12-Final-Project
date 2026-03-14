import React from "react";
import { Link } from "@inertiajs/react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";

export default function LogoutModal({ open, onOpenChange }) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Confirm Logout</DialogTitle>
					<DialogDescription>
						Are you sure you want to log out of your account?
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="mt-4">
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Link 
						href={route("logout")} 
						method="post" 
						as="button" 
						className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 h-9 px-4 py-2"
					>
						Logout
					</Link>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
