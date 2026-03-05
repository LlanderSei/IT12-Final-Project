import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

window.axios.interceptors.response.use(
	(response) => response,
	(error) => {
		const status = error?.response?.status;
		if (status === 403 && typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("app-toast", {
					detail: {
						type: "error",
						message: "Insufficient permission.",
					},
				}),
			);
		}
		return Promise.reject(error);
	},
);
