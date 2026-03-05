import { useMemo } from "react";
import { usePage } from "@inertiajs/react";

export default function usePermissions() {
	const { auth } = usePage().props;
	const permissionsSet = useMemo(
		() => new Set(auth?.user?.permissions || []),
		[auth?.user?.permissions],
	);

	const can = (permissionName) => permissionsSet.has(permissionName);
	const canAny = (permissionNames = []) =>
		permissionNames.length === 0 || permissionNames.some((name) => can(name));
const canAll = (permissionNames = []) =>
		permissionNames.every((name) => can(name));
	const deny = (message = "Insufficient permission.") => {
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("app-toast", {
					detail: {
						type: "error",
						message,
					},
				}),
			);
		}
		return false;
	};
	const requirePermission = (permissionName, message) =>
		can(permissionName) || deny(message);
	const requireAny = (permissionNames = [], message) =>
		canAny(permissionNames) || deny(message);
	const requireAll = (permissionNames = [], message) =>
		canAll(permissionNames) || deny(message);

	return {
		permissionsSet,
		can,
		canAny,
		canAll,
		deny,
		requirePermission,
		requireAny,
		requireAll,
	};
}
