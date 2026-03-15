import React from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, useForm } from "@inertiajs/react";
import usePermissions from "@/hooks/usePermissions";
import { Save, ExternalLink, Info } from "lucide-react";

const Settings = ({ auth, settings }) => {
	const { can } = usePermissions();
	const canUpdate = can("CanUpdateImageHosting");

	const { data, setData, put, processing, errors, recentlySuccessful } = useForm({
		image_hosting_service: settings.image_hosting_service || "ImgBB",
		imgbb_api_key: settings.imgbb_api_key || "",
	});

	const handleSubmit = (e) => {
		e.preventDefault();
		put(route("application.settings.update"));
	};

	return (
		<AuthenticatedLayout
			user={auth.user}
			header={
				<h2 className="font-semibold text-xl text-gray-800 leading-tight">
					Application Settings
				</h2>
			}
		>
			<Head title="Application Settings" />

			<div className="py-12">
				<div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
					<div className="p-4 sm:p-8 bg-white shadow sm:rounded-lg">
						<section className="max-w-xl">
							<header>
								<h2 className="text-lg font-medium text-gray-900">
									Image Hosting Configuration
								</h2>
								<p className="mt-1 text-sm text-gray-600">
									Configure how your application handles image uploads. 
									Database settings take precedence over environment variables.
								</p>
							</header>

							<form onSubmit={handleSubmit} className="mt-6 space-y-6">
								<div>
									<label
										htmlFor="image_hosting_service"
										className="block text-sm font-medium text-gray-700"
									>
										Image Hosting Service
									</label>
									<select
										id="image_hosting_service"
										value={data.image_hosting_service}
										onChange={(e) => setData("image_hosting_service", e.target.value)}
										disabled={!canUpdate}
										className="mt-1 block w-full border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
									>
										<option value="ImgBB">ImgBB</option>
									</select>
									{errors.image_hosting_service && (
										<p className="mt-2 text-sm text-red-600">
											{errors.image_hosting_service}
										</p>
									)}
								</div>

								{data.image_hosting_service === "ImgBB" && (
									<div>
										<label
											htmlFor="imgbb_api_key"
											className="block text-sm font-medium text-gray-700"
										>
											ImgBB API Key
										</label>
										<input
											id="imgbb_api_key"
											type="password"
											value={data.imgbb_api_key}
											onChange={(e) => setData("imgbb_api_key", e.target.value)}
											disabled={!canUpdate}
											className="mt-1 block w-full border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
											placeholder="Enter your ImgBB API Key"
										/>
										{errors.imgbb_api_key && (
											<p className="mt-2 text-sm text-red-600">
												{errors.imgbb_api_key}
											</p>
										)}
									</div>
								)}

								<div className="flex items-center gap-4">
									<button
										type="submit"
										disabled={processing || !canUpdate}
										className="inline-flex items-center px-4 py-2 bg-primary border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-primary-hover focus:bg-primary-hover active:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition ease-in-out duration-150 disabled:opacity-50"
									>
										<Save className="w-4 h-4 mr-2" />
										Save Settings
									</button>

									{recentlySuccessful && (
										<p className="text-sm text-gray-600">Saved.</p>
									)}
								</div>
							</form>
						</section>
					</div>

					<div className="p-4 sm:p-8 bg-white shadow sm:rounded-lg">
						<section>
							<header className="flex items-center gap-2">
								<Info className="w-5 h-5 text-primary" />
								<h2 className="text-lg font-medium text-gray-900">
									Setup Guide: ImgBB API Key
								</h2>
							</header>

							<div className="mt-4 prose prose-sm text-gray-600 max-w-none">
								<p>
									ImgBB is a free image hosting service. To get your API key, follow these steps:
								</p>
								<ol className="list-decimal list-inside space-y-2 mt-2">
									<li>
										Go to the{" "}
										<a
											href="https://api.imgbb.com/"
											target="_blank"
											rel="noopener noreferrer"
											className="text-primary hover:underline inline-flex items-center"
										>
											ImgBB API Page
											<ExternalLink className="w-3 h-3 ml-1" />
										</a>
									</li>
									<li>Sign in or create a free account.</li>
									<li>
										Copy your <strong>API Key</strong> from the dashboard.
									</li>
									<li>Paste the key into the field above and save.</li>
								</ol>
								<div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-700 text-xs">
									<strong>Note:</strong> By using this service, your product images will be hosted externally. 
									This ensures your application stays lightweight and avoids local storage limitations.
								</div>
							</div>
						</section>
					</div>
				</div>
			</div>
		</AuthenticatedLayout>
	);
};

export default Settings;
