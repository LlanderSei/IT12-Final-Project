import React, { useEffect } from "react";
import { formatCountLabel } from "@/utils/countLabel";

export default function Permissions({ onHeaderMetaChange }) {
	const permissionsCount = 0;
	const countLabel = formatCountLabel(permissionsCount, "permission");

	useEffect(() => {
		onHeaderMetaChange?.({
			subtitle: "Permissions",
			countLabel,
		});
	}, [onHeaderMetaChange, countLabel]);

	return (
		<div className="flex flex-col flex-1 w-full relative overflow-hidden min-h-0">
			<div className="flex-1 flex flex-col overflow-hidden min-h-0">
				<div className="mx-auto w-full flex-1 flex flex-col overflow-hidden min-h-0">
					<div className="bg-white shadow-sm sm:rounded-lg flex-1 flex flex-col overflow-hidden min-h-0">
						<div className="p-6 flex-1 flex flex-col overflow-hidden min-h-0">
							<div className="border rounded-lg border-gray-200 flex-1 min-h-0 flex items-center justify-center">
								<p className="text-sm text-gray-500">No permissions found.</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
