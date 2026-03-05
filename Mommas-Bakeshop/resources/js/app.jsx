import "../css/app.css";
import "./bootstrap";

import { createInertiaApp } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { createRoot } from "react-dom/client";

// const appName = import.meta.env.VITE_APP_NAME || "Laravel";
const applyStoredTheme = () => {
	if (typeof window === "undefined") return;
	const root = window.document.documentElement;
	const stored = window.localStorage.getItem("site:theme");
	const theme = stored === "dark" ? "dark" : "light";
	root.classList.remove("theme-dark", "theme-light");
	root.classList.add(theme === "dark" ? "theme-dark" : "theme-light");
};

applyStoredTheme();

createInertiaApp({
	title: (title) => `${title}`,
	resolve: (name) =>
		resolvePageComponent(
			`./Pages/${name}.jsx`,
			import.meta.glob("./Pages/**/*.jsx"),
		),
	setup({ el, App, props }) {
		const root = createRoot(el);

		root.render(<App {...props} />);
	},
	progress: {
		color: "var(--color-primary-hex)",
	},
});

