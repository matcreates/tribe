import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PricingSection } from "@/components/landing/PricingSection";
import { InteractiveDemo } from "@/components/landing/InteractiveDemo";
import { HeroVisualization } from "@/components/landing/HeroVisualization";
import { IPhoneMockup } from "@/components/landing/IPhoneMockup";

export default async function LandingPage() {
  // If user is already logged in, redirect to dashboard
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen landing-paper-bg">
      {/* Navigation with gradient background */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4 sm:py-5" style={{ background: 'linear-gradient(180deg, rgba(239, 237, 231, 0.98) 0%, rgba(239, 237, 231, 0.9) 60%, rgba(239, 237, 231, 0) 100%)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <TribeLogo className="h-[18px] sm:h-[22px] w-auto text-black/80" />
          <div className="flex items-center gap-1 sm:gap-3">
            <a
              href="#pricing"
              className="px-3 sm:px-5 py-2 text-[10px] sm:text-[11px] font-medium tracking-[0.1em] uppercase text-black/50 hover:text-black/80 transition-colors"
            >
              Pricing
            </a>
            <Link
              href="/login"
              className="px-3 sm:px-5 py-2 text-[10px] sm:text-[11px] font-medium tracking-[0.1em] uppercase text-black/50 hover:text-black/80 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="hidden sm:inline-block px-5 py-2 rounded-full text-[11px] font-medium tracking-[0.1em] uppercase bg-black/90 text-white hover:bg-black transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[70vh] sm:min-h-[85vh] flex items-center px-5 sm:px-6 pt-24 sm:pt-32 pb-24 sm:pb-48 overflow-hidden">
        <div className="relative z-10 max-w-6xl mx-auto w-full flex flex-col lg:flex-row items-center lg:items-center gap-8 lg:gap-0">
          {/* Left: Text content */}
          <div className="text-center lg:text-left lg:flex-1 lg:pr-8">
            <h1 
              className="text-[2rem] sm:text-[3.5rem] md:text-[4.5rem] lg:text-[5.5rem] font-light leading-[1.05] mb-4 sm:mb-6 hero-title-light"
              style={{ 
                fontFamily: 'HeritageSerifLight, Georgia, serif',
                letterSpacing: '-0.08em',
              }}
            >
              The newsletter tool<br />made for creators
            </h1>
            
            <p className="text-[14px] sm:text-[15px] md:text-[17px] text-black/45 leading-relaxed max-w-xl mb-6 sm:mb-10 px-2 lg:px-0 mx-auto lg:mx-0">
              Time to start building a community that doesn&apos;t depend on any algorithm.
            </p>

            <Link
              href="/signup"
              className="inline-block px-10 py-3.5 rounded-full text-[11px] font-medium tracking-[0.12em] uppercase bg-black/90 text-white hover:bg-black transition-colors"
            >
              Start for free
            </Link>

            {/* Social proof hint */}
            <p className="mt-6 sm:mt-10 text-[11px] sm:text-[12px] text-black/30">
              Free up to 500 members · Paid plans from $5/mo
            </p>
          </div>

          {/* Right: Tribe visualization */}
          <div className="relative w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] lg:w-[480px] lg:h-[480px] flex-shrink-0">
            <HeroVisualization />
          </div>
        </div>
      </section>

      {/* Interactive Demo */}
      <InteractiveDemo />

      {/* Features Section */}
      <section className="relative py-16 sm:py-32 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-20">
            <h2 
              className="text-[clamp(1.5rem,4vw,2.5rem)] font-normal text-black/85 mb-4"
              style={{ fontFamily: 'HeritageSerif, Georgia, serif' }}
            >
              Everything you need, nothing you don&apos;t
            </h2>
            <p className="text-[14px] sm:text-[15px] text-black/45 max-w-lg mx-auto">
              Built for simplicity. Focus on what matters: connecting with your audience.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
            {[
              {
                icon: <svg className="w-5 h-5" viewBox="0 0 22 21" fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M3 3.5C3 4.02384 3.11743 4.53557 3.33772 5H1C0.44772 5 0 5.44772 0 6V11C0 11.5523 0.44772 12 1 12H2V20C2 20.5523 2.44772 21 3 21H19C19.5523 21 20 20.5523 20 20V12H21C21.5523 12 22 11.5523 22 11V6C22 5.44772 21.5523 5 21 5H18.6623C18.8826 4.53557 19 4.02384 19 3.5C19 2.57174 18.6313 1.6815 17.9749 1.02513C17.3185 0.36875 16.4283 0 15.5 0C14.1769 0 13.1209 0.37202 12.3032 0.97769C11.7384 1.39606 11.316 1.90438 11 2.42396C10.684 1.90438 10.2616 1.39606 9.6968 0.97769C8.87913 0.37202 7.82309 0 6.5 0C5.57174 0 4.6815 0.36875 4.02513 1.02513C3.36875 1.6815 3 2.57174 3 3.5ZM6.5 2C6.10218 2 5.72064 2.15804 5.43934 2.43934C5.15804 2.72064 5 3.10218 5 3.5C5 3.89782 5.15804 4.27936 5.43934 4.56066C5.72064 4.84196 6.10218 5 6.5 5H10V7H2V10H10V19H4V12H2V10H10V7H2V5H6.5ZM12 5H15.5C15.8978 5 16.2794 4.84196 16.5607 4.56066C16.842 4.27936 17 3.89782 17 3.5C17 3.10218 16.842 2.72064 16.5607 2.43934C16.2794 2.15804 15.8978 2 15.5 2C14.5731 2 13.9416 2.25298 13.4937 2.58481C13.034 2.92528 12.7063 3.39508 12.4744 3.91036C12.3066 4.2833 12.1968 4.66322 12.1255 5H12ZM12 7V10H20V7H12ZM12 19V12H18V19H12Z" /></svg>,
                title: "Gift downloads",
                description: "Reward new subscribers with exclusive downloads. PDFs, wallpapers, anything you want to share."
              },
              {
                icon: <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="5" r="2.5" /><path d="M3 14c0-2.5 2.5-4 5-4s5 1.5 5 4" /></svg>,
                title: "Grow your tribe",
                description: "Get a custom join page. Share the link and watch your community grow organically."
              },
              {
                icon: <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="2" /><path d="M1.5 8c0 0 2.5-4.5 6.5-4.5s6.5 4.5 6.5 4.5-2.5 4.5-6.5 4.5-6.5-4.5-6.5-4.5z" /></svg>,
                title: "Real insights",
                description: "See who is reading, track opens, and understand your audience with clear analytics."
              },
              {
                icon: <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 4.5l-7 7L3 8" /></svg>,
                title: "Verified members",
                description: "Double opt in keeps your list clean and your engagement rates high."
              },
              {
                icon: <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 8.5a3 3 0 0 0 4.2.4l2-2a3 3 0 0 0-4.2-4.2l-1.1 1.1" /><path d="M9.5 7.5a3 3 0 0 0-4.2-.4l-2 2a3 3 0 0 0 4.2 4.2l1.1-1.1" /></svg>,
                title: "Your own URL",
                description: "Every creator gets a unique @username page. Professional and memorable."
              },
              {
                icon: <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 5L2 8l4 3" /><path d="M2 8h8a4 4 0 0 1 4 4v1" /></svg>,
                title: "Replies enabled",
                description: "Let your tribe reply directly to your emails. Every response lands in your dashboard."
              },
            ].map((feature, i) => (
              <div 
                key={i}
                className="p-5 sm:p-6 rounded-2xl border border-black/[0.06] transition-colors hover:border-black/[0.12] bg-white/60"
              >
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center mb-3 sm:mb-4 text-black/50" style={{ background: 'rgba(0, 0, 0, 0.05)' }}>{feature.icon}</div>
                <h3 className="text-[14px] sm:text-[15px] font-medium text-black/80 mb-2">{feature.title}</h3>
                <p className="text-[12px] sm:text-[13px] text-black/45 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PricingSection />

      {/* iPhone App Section */}
      <section className="relative py-16 sm:py-32 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
            {/* iPhone mockup */}
            <div className="flex justify-center md:justify-end order-2 md:order-1">
              <IPhoneMockup />
            </div>
            
            {/* Text content */}
            <div className="text-center md:text-left order-1 md:order-2">
              {/* App icon */}
              <div className="mb-4 sm:mb-6">
                <Image 
                  src="/app-icon-light.png" 
                  alt="Tribe app icon" 
                  width={96} 
                  height={96}
                  className="w-[72px] h-[72px] sm:w-[96px] sm:h-[96px] rounded-[16px] sm:rounded-[28px] mx-auto md:mx-0 border border-black/[0.08]"
                />
              </div>
              
              <h2 
                className="text-[clamp(1.5rem,4vw,2.5rem)] font-normal text-black/85 mb-4"
                style={{ fontFamily: 'HeritageSerif, Georgia, serif' }}
              >
                Your Tribe is in your pocket
              </h2>
              <p className="text-[14px] sm:text-[15px] text-black/45 leading-relaxed mb-6 sm:mb-8 max-w-md mx-auto md:mx-0">
                Write and send emails, manage your subscribers, and track your growth from anywhere. The Tribe app puts your entire newsletter in your pocket.
              </p>
              <a
                href="https://apps.apple.com/app/tribe"
                target="_blank"
                rel="noreferrer"
                className="inline-block"
              >
                <Image 
                  src="/app-store-badge.png" 
                  alt="Download on the App Store" 
                  width={160} 
                  height={54}
                  className="h-[48px] sm:h-[54px] w-auto mx-auto md:mx-0"
                />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 sm:px-6 border-t border-black/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TribeLogo className="h-4 w-auto text-black/40" />
            <span className="text-[12px] text-black/30">© 2026</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center">
            <Link href="/login" className="text-[11px] sm:text-[12px] text-black/35 hover:text-black/60 transition-colors">
              Sign in
            </Link>
            <Link href="/signup" className="text-[11px] sm:text-[12px] text-black/35 hover:text-black/60 transition-colors">
              Get started
            </Link>
            <a
              href="https://instagram.com/madewithtribe"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] sm:text-[12px] text-black/35 hover:text-black/60 transition-colors"
            >
              Instagram
            </a>
            <a
              href="https://www.instagram.com/matcreates/"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] sm:text-[12px] text-black/25 hover:text-black/45 transition-colors"
            >
              made by @matcreates
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TribeLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 25" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.812 1.044L16.596 5.796C16.572 6.204 16.524 6.48 16.452 6.624C16.404 6.744 16.284 6.804 16.092 6.804C15.924 6.804 15.792 6.744 15.696 6.624C15.624 6.504 15.552 6.336 15.48 6.12C15.432 5.904 15.372 5.652 15.3 5.364C15.228 5.076 15.144 4.752 15.048 4.392C14.712 3.624 14.256 3.144 13.68 2.952C13.104 2.736 12.264 2.628 11.16 2.628H10.584C10.44 2.628 10.32 2.7 10.224 2.844C10.152 2.964 10.116 3.084 10.116 3.204V20.844C10.116 21.228 10.116 21.54 10.116 21.78C10.14 22.02 10.176 22.224 10.224 22.392C10.296 22.536 10.392 22.656 10.512 22.752C10.656 22.848 10.848 22.932 11.088 23.004C11.304 23.076 11.508 23.124 11.7 23.148C11.892 23.148 12.06 23.16 12.204 23.184C12.348 23.208 12.456 23.256 12.528 23.328C12.624 23.4 12.672 23.532 12.672 23.724C12.672 24.06 12.42 24.228 11.916 24.228C11.532 24.228 11.052 24.192 10.476 24.12C9.924 24.024 9.264 23.976 8.496 23.976C7.752 23.976 7.092 24.024 6.516 24.12C5.94 24.192 5.46 24.228 5.076 24.228C4.572 24.228 4.32 24.036 4.32 23.652C4.32 23.484 4.368 23.364 4.464 23.292C4.56 23.22 4.68 23.172 4.824 23.148C4.968 23.124 5.136 23.112 5.328 23.112C5.52 23.112 5.712 23.076 5.904 23.004C6.36 22.86 6.636 22.656 6.732 22.392C6.828 22.128 6.876 21.612 6.876 20.844V3.312C6.876 3.168 6.828 3.024 6.732 2.88C6.66 2.712 6.552 2.628 6.408 2.628H5.4C4.656 2.628 4.044 2.772 3.564 3.06C3.084 3.348 2.616 3.78 2.16 4.356C1.728 5.076 1.392 5.64 1.152 6.048C0.936 6.456 0.684 6.66 0.396 6.66H0.324C0.228 6.66 0.144 6.636 0.072 6.588C0.024 6.54 0 6.396 0 6.156C0 6.132 0.012 6.06 0.036 5.94C0.06 5.82 0.096 5.688 0.144 5.544L1.044 1.872C1.164 1.32 1.248 0.875999 1.296 0.539999C1.368 0.204 1.524 0.0359995 1.764 0.0359995C1.86 0.0359995 1.932 0.0959995 1.98 0.215999C2.052 0.335999 2.112 0.48 2.16 0.648C2.232 0.792 2.292 0.936 2.34 1.08C2.388 1.2 2.472 1.26 2.592 1.26C2.808 1.476 3.372 1.584 4.284 1.584C4.62 1.584 5.004 1.584 5.436 1.584C5.868 1.56 6.348 1.548 6.876 1.548H11.304C11.904 1.548 12.432 1.56 12.888 1.584C13.368 1.608 13.776 1.62 14.112 1.62C14.688 1.62 15.072 1.56 15.264 1.44C15.432 1.344 15.564 1.212 15.66 1.044C15.78 0.876 15.876 0.720001 15.948 0.576001C16.02 0.408 16.092 0.276 16.164 0.18C16.236 0.0599999 16.32 0 16.416 0C16.56 0 16.656 0.0840003 16.704 0.252001C16.776 0.396001 16.812 0.528 16.812 0.648V1.044Z" />
      <path d="M18.56 8.388V9.792C18.56 10.008 18.596 10.116 18.668 10.116C18.716 10.116 18.824 10.032 18.992 9.864L19.712 9.072C20.48 8.16 21.296 7.704 22.16 7.704C22.808 7.704 23.36 7.944 23.816 8.424C24.272 8.904 24.5 9.504 24.5 10.224C24.5 10.752 24.332 11.184 23.996 11.52C23.684 11.856 23.3 12.024 22.844 12.024C22.484 12.024 22.172 11.94 21.908 11.772C21.644 11.58 21.404 11.376 21.188 11.16C20.972 10.944 20.768 10.752 20.576 10.584C20.384 10.392 20.192 10.296 20 10.296C19.112 10.296 18.668 11.424 18.668 13.68V21.492C18.668 21.9 18.716 22.212 18.812 22.428C18.908 22.62 19.1 22.776 19.388 22.896C19.676 23.04 19.94 23.136 20.18 23.184C20.42 23.208 20.612 23.244 20.756 23.292C20.924 23.316 21.056 23.364 21.152 23.436C21.248 23.508 21.296 23.64 21.296 23.832C21.296 23.976 21.224 24.108 21.08 24.228C20.96 24.324 20.768 24.372 20.504 24.372C20.024 24.372 19.496 24.324 18.92 24.228C18.368 24.156 17.78 24.12 17.156 24.12C16.58 24.12 16.04 24.156 15.536 24.228C15.056 24.3 14.624 24.336 14.24 24.336C13.808 24.336 13.592 24.144 13.592 23.76C13.592 23.592 13.628 23.484 13.7 23.436C13.772 23.364 13.868 23.316 13.988 23.292C14.108 23.244 14.252 23.208 14.42 23.184C14.588 23.16 14.768 23.1 14.96 23.004C15.296 22.836 15.488 22.668 15.536 22.5C15.608 22.308 15.644 22.044 15.644 21.708V12.492C15.644 12.06 15.56 11.772 15.392 11.628C15.248 11.484 15.08 11.388 14.888 11.34C14.72 11.292 14.552 11.256 14.384 11.232C14.24 11.184 14.168 11.052 14.168 10.836C14.168 10.572 14.324 10.38 14.636 10.26C14.948 10.116 15.356 9.876 15.86 9.54C16.556 9.06 17.06 8.628 17.372 8.244C17.708 7.836 17.984 7.632 18.2 7.632C18.44 7.632 18.56 7.884 18.56 8.388Z" />
      <path d="M29.68 8.388V21.528C29.68 21.96 29.716 22.284 29.788 22.5C29.884 22.716 30.04 22.884 30.256 23.004C30.448 23.1 30.628 23.16 30.796 23.184C30.988 23.208 31.144 23.244 31.264 23.292C31.408 23.316 31.516 23.364 31.588 23.436C31.684 23.508 31.732 23.628 31.732 23.796C31.732 24.18 31.516 24.372 31.084 24.372C30.724 24.372 30.292 24.324 29.788 24.228C29.284 24.156 28.744 24.12 28.168 24.12C27.544 24.12 27.016 24.156 26.584 24.228C26.152 24.324 25.804 24.372 25.54 24.372C25.18 24.372 25 24.168 25 23.76C25 23.592 25.024 23.472 25.072 23.4C25.144 23.328 25.228 23.28 25.324 23.256C25.444 23.232 25.564 23.22 25.684 23.22C25.804 23.196 25.936 23.148 26.08 23.076C26.344 22.932 26.5 22.764 26.548 22.572C26.62 22.356 26.656 22.008 26.656 21.528V13.032C26.656 12.384 26.572 11.952 26.404 11.736C26.26 11.52 26.092 11.388 25.9 11.34C25.732 11.268 25.564 11.232 25.396 11.232C25.252 11.208 25.18 11.076 25.18 10.836C25.18 10.572 25.336 10.356 25.648 10.188C25.984 10.02 26.452 9.768 27.052 9.432C27.412 9.216 27.712 9 27.952 8.784C28.216 8.568 28.432 8.376 28.6 8.208C28.72 8.088 29.232 7.744 29.3523 7.812C29.5072 7.812 29.68 7.884 29.68 8.388Z" />
      <path d="M35.38 4V9.912C35.38 10.056 35.404 10.128 35.452 10.128C35.524 10.128 35.62 10.068 35.74 9.948L36.172 9.516C36.844 8.82 37.468 8.316 38.044 8.004C38.644 7.668 39.34 7.5 40.132 7.5C40.924 7.5 41.68 7.692 42.4 8.076C43.12 8.46 43.744 9.012 44.272 9.732C44.8 10.428 45.22 11.28 45.532 12.288C45.844 13.296 46 14.412 46 15.636C46 16.98 45.82 18.204 45.46 19.308C45.1 20.412 44.584 21.36 43.912 22.152C43.264 22.944 42.484 23.556 41.572 23.988C40.684 24.444 39.7 24.672 38.62 24.672C36.5 24.672 35 24.004 35 24.004C35 24.004 33.868 23.592 33 23.004C32.6332 22.7555 32.5 22.504 32.464 22.004C32.4081 21.2271 32.356 20.904 32.356 19.92V4.648C32.356 4.336 32.3125 4.02425 32 3.868C31 3.368 31.284 2.46 32.392 2.164C33.5 1.868 33.844 1.564 34.228 1.3C34.636 1.012 34.9 0.868002 35.02 0.868002C35.212 0.868002 35.332 0.928002 35.38 1.048C35.428 1.168 35.452 1.336 35.452 1.552C35.452 1.912 35.44 2.296 35.416 2.704C35.392 3.088 35.38 3.52 35.38 4ZM35.38 20.208C35.38 21.36 35.632 22.212 36.136 22.764C36.664 23.316 37.384 23.592 38.296 23.592C38.992 23.592 39.628 23.424 40.204 23.088C40.78 22.752 41.272 22.284 41.68 21.684C42.112 21.06 42.436 20.328 42.652 19.488C42.892 18.624 43.012 17.688 43.012 16.68C43.012 14.52 42.556 12.864 41.644 11.712C40.756 10.536 39.628 9.948 38.26 9.948C37.564 9.948 37.024 10.068 36.64 10.308C36.256 10.548 35.968 10.884 35.776 11.316C35.584 11.748 35.464 12.276 35.416 12.9C35.392 13.5 35.38 14.172 35.38 14.916V20.208Z" />
      <path d="M52.728 12.72C53.904 12.72 54.756 12.588 55.284 12.324C55.836 12.06 56.112 11.532 56.112 10.74C56.112 10.14 55.86 9.588 55.356 9.084C54.876 8.58 54.252 8.328 53.484 8.328C52.644 8.328 51.912 8.652 51.288 9.3C50.664 9.948 50.256 10.764 50.064 11.748L49.956 12.324V12.396C49.956 12.612 50.1 12.72 50.388 12.72H52.728ZM58.056 13.836H50.1C49.908 13.836 49.788 13.872 49.74 13.944C49.692 14.016 49.668 14.172 49.668 14.412V15.276C49.668 17.508 50.136 19.272 51.072 20.568C52.032 21.864 53.268 22.512 54.78 22.512C55.452 22.512 56.028 22.404 56.508 22.188C57.012 21.972 57.42 21.732 57.732 21.468C58.068 21.204 58.32 20.964 58.488 20.748C58.68 20.532 58.812 20.424 58.884 20.424C59.076 20.424 59.172 20.556 59.172 20.82C59.172 21.084 59.028 21.432 58.74 21.864C58.452 22.296 58.032 22.728 57.48 23.16C56.952 23.568 56.316 23.928 55.572 24.24C54.828 24.552 53.988 24.708 53.052 24.708C52.068 24.708 51.168 24.504 50.352 24.096C49.56 23.712 48.876 23.148 48.3 22.404C47.724 21.66 47.28 20.76 46.968 19.704C46.656 18.648 46.5 17.46 46.5 16.14C46.5 14.82 46.668 13.632 47.004 12.576C47.364 11.496 47.856 10.584 48.48 9.84C49.104 9.096 49.836 8.52 50.676 8.112C51.54 7.704 52.476 7.5 53.484 7.5C54.348 7.5 55.14 7.656 55.86 7.968C56.58 8.256 57.192 8.652 57.696 9.156C58.2 9.66 58.584 10.248 58.848 10.92C59.136 11.592 59.28 12.312 59.28 13.08C59.28 13.392 59.184 13.596 58.992 13.692C58.8 13.788 58.488 13.836 58.056 13.836Z" />
      <path d="M30 3.5C30 4.88071 29.1046 6 28 6C26.8954 6 26 4.88071 26 3.5C26 2.11929 26.8954 1 28 1C29.1046 1 30 2.11929 30 3.5Z" />
    </svg>
  );
}
