/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'ui-avatars.com',
      'res.cloudinary.com',
      'cdn.discordapp.com',
      'lh3.googleusercontent.com',
      'api.dicebear.com'
    ],
  },
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
  },
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  },
}

module.exports = nextConfig
