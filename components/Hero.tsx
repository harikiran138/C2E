import Image from 'next/image';
import { ChevronDown } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative h-[90vh] min-h-[600px] flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/giraffe-hero.jpg"
          alt="C2E Hero"
          fill
          priority
          className="object-cover object-center brightness-[0.85]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-primary/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col items-end text-right space-y-4 md:space-y-6 animate-in fade-in slide-in-from-right duration-1000">
          <div className="space-y-0">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-[#1a1a1a] drop-shadow-sm leading-tight">
              Compliance <br />
              To Excellence
            </h1>
            <p className="text-lg md:text-xl text-[#3a3a3a] font-bold max-w-xl ml-auto">
              Stand confident, stay competent, and distinguish yourself
            </p>
          </div>
          
          <button className="inline-flex items-center px-8 py-3 bg-[#c5a059] text-white font-bold rounded-lg shadow-xl hover:bg-primary transition-all duration-300 hover-lift text-lg space-x-2">
            <span>Learn More</span>
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Decorative Wavy Curve */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
        <svg className="relative block w-[calc(100%+1.3px)] h-[150px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5,73.84-4.36,147.54,16.88,218.2,35.26,69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" fill="#ffffff" opacity=".25"></path>
          <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5V0Z" fill="#ffffff" opacity=".5"></path>
          <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" fill="#ffffff"></path>
        </svg>
      </div>
    </section>
  );
}
