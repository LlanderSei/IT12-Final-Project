import React from "react";
import Modal from "./Modal";
import DangerButton from "./DangerButton";
import SecondaryButton from "./SecondaryButton";

export default function ConfirmationModal({
	show = false,
	onClose = () => {},
	onConfirm = () => {},
	title = "Confirm Action",
	message = "Are you sure you want to proceed?",
	confirmText = "Confirm",
	cancelText = "Cancel",
	processing = false,
}) {
	return (
		<Modal show={show} onClose={onClose} maxWidth="md">
			<div className="p-6">
				<h2 className="text-lg font-medium text-gray-900">{title}</h2>

				<p className="mt-1 text-sm text-gray-600">{message}</p>

				<div className="mt-6 flex justify-end">
					<SecondaryButton onClick={onClose} disabled={processing}>
						{cancelText}
					</SecondaryButton>

					<DangerButton
						className="ms-3"
						onClick={onConfirm}
						disabled={processing}
					>
						{confirmText}
					</DangerButton>
				</div>
			</div>
		</Modal>
	);
}
