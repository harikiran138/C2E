/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'lodash', 'recharts', 'framer-motion', '@radix-ui/react-icons'],
  },
  /* headers removed */
};

export default nextConfig;
