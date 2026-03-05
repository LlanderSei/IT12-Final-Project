import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
		'./storage/framework/views/*.php',
		'./resources/views/**/*.blade.php',
		'./resources/js/**/*.jsx',
	],

	theme: {
		extend: {
			fontFamily: {
				sans: ['Figtree', ...defaultTheme.fontFamily.sans],
			},
			colors: {
				primary: 'rgb(var(--color-primary) / <alpha-value>)',
				'primary-hover': 'rgb(var(--color-primary-hover) / <alpha-value>)',
				'primary-active': 'rgb(var(--color-primary-active) / <alpha-value>)',
				'primary-soft': 'rgb(var(--color-primary-soft) / <alpha-value>)',
			},
		},
	},

	plugins: [forms],
};
