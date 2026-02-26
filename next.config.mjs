/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'lodash', 'recharts', 'framer-motion', '@radix-ui/react-icons'],
  },
  async rewrites() {
    return [
      {
        source: '/ai_proxy/:path*',
        destination: 'http://localhost:8001/:path*',
      },
    ];
  },
};

export default nextConfig;
