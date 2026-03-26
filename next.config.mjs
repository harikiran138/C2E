/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'lodash', 'recharts', 'framer-motion', '@radix-ui/react-icons'],
  },
  async rewrites() {
    const isProd = process.env.NODE_ENV === 'production';
    return [
      {
        source: '/ai_proxy/:path*',
        destination: isProd ? '/api/main/:path*' : 'http://127.0.0.1:8001/:path*',
      },
    ];
  },
};

export default nextConfig;
