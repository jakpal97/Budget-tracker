/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	swcMinify: true,
	experimental: {
		serverActions: {
			allowedOrigins: ['localhost:3000', 'localhost:3001'],
		},
	},
	images: {
		domains: [], // dodaj domeny dla obrazów jeśli potrzebne
	},
	api: {
		bodyParser: {
			sizeLimit: '10mb',
		},
		externalResolver: true,
	},
}

module.exports = nextConfig
