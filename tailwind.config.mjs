const flowbite = require("flowbite-react/tailwind");


/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
		flowbite.content(),
	],
	// darkMode: 'false',
	darkMode: 'class',
	theme: {
		extend: {
			screens: {
				'3xl': '1920px',
			},
			lineHeight: {
				'extra-loose': '1.8',
			},
			colors: {
				primary: { "200": "#E6EDF3", "500": "#024C84" },
				grey: "#F3F3F3",
				darkBlue: "#19263D",
				// stone: "#F2EFE5",
				stone: "#ECEAE6",
			}
		},
		fontFamily: {
			'title': [
				'TT Hoves Pro',
				'ui-sans-serif',
				'system-ui',
				'-apple-system',
				'system-ui',
				'Segoe UI',
				'Roboto',
				'Helvetica Neue',
				'Arial',
				'Noto Sans',
				'sans-serif',
			],
			'body': [
				'TT Hoves Pro',
				'ui-sans-serif',
				'system-ui',
				'-apple-system',
				'system-ui',
				'Segoe UI',
				'Roboto',
				'Helvetica Neue',
				'Arial',
				'Noto Sans',
				'sans-serif',
				'Apple Color Emoji',
				'Segoe UI Emoji',
				'Segoe UI Symbol',
				'Noto Color Emoji'
			],
			'sans': [
				'TT Hoves Pro',
				'ui-sans-serif',
				'system-ui',
				'-apple-system',
				'system-ui',
				'Segoe UI',
				'Roboto',
				'Helvetica Neue',
				'Arial',
				'Noto Sans',
				'sans-serif',
				'Apple Color Emoji',
				'Segoe UI Emoji',
				'Segoe UI Symbol',
				'Noto Color Emoji'
			]
		}
	},
	plugins: [
		require('@tailwindcss/typography'),
		flowbite.plugin(),
	],
}
