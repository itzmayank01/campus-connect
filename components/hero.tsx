import Link from "next/link"

export function Hero() {
  return (
    <section className="relative w-full min-h-[90vh] flex items-center pt-[100px] overflow-hidden bg-white">
      {/* 1280px max-width container */}
      <div className="mx-auto w-full max-w-[1280px] px-6 md:px-[48px] relative z-10 flex flex-col xl:flex-row items-center justify-between gap-12 xl:gap-8">
        
        {/* Left Column (55%) */}
        <div className="w-full xl:w-[55%] flex flex-col items-center text-center xl:items-start xl:text-left">
          
          {/* Badge */}
          <div className="mb-6 flex items-center gap-2 rounded-full bg-[#E6F1FB] px-[14px] py-[6px] text-[13px] font-medium text-[#185FA5]">
            <span className="h-2 w-2 rounded-full bg-[#185FA5]" />
            AI-Powered Academic Platform
          </div>

          {/* Headline */}
          <h1 className="text-[28px] md:text-[36px] xl:text-[56px] leading-[1.1] tracking-tight">
            <span className="font-normal text-[#0f172a]">Smarter Academic Resource Platform for</span>{" "}
            <span className="font-bold text-[#185FA5]">Engineers</span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 w-full max-w-[480px] text-[18px] leading-[1.6] text-[#475569]">
            Harness AI-driven recommendations, semester-wise study materials, and
            secure cloud infrastructure to accelerate your engineering journey.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col md:flex-row items-center xl:items-start justify-center xl:justify-start gap-[12px] w-full md:w-auto">
            <Link href="/login" className="w-full md:w-auto">
              <button className="w-full md:w-auto bg-[#185FA5] hover:bg-[#0C447C] text-white rounded-[8px] px-[28px] py-[14px] font-medium text-[15px] transition duration-200">
                Get Started →
              </button>
            </Link>
            <button className="w-full md:w-auto bg-transparent border-[1.5px] border-[#185FA5] text-[#185FA5] hover:bg-[#E6F1FB] rounded-[8px] px-[24px] py-[14px] font-medium text-[15px] transition duration-200">
              Learn More
            </button>
          </div>

          {/* Social Proof */}
          <div className="mt-[28px] text-[13px] text-[#64748b]">
            <span className="text-[#EF9F27] tracking-widest mr-2 text-[14px]">★★★★★</span>
            Trusted by 500+ engineering students across 12 colleges
          </div>

        </div>

        {/* Right Column (45%) */}
        <div className="w-full xl:w-[45%] hidden md:flex flex-col items-center xl:items-end justify-center">
           <div 
              className="relative w-full max-w-[480px] xl:max-w-full rounded-[20px] bg-[#F8FAFC] p-[24px]" 
              style={{ 
                 boxShadow: '0 20px 60px rgba(0,0,0,0.10)',
                 animation: 'float 4s ease-in-out infinite' 
              }}
           >
              {/* Inline style for the float animation as requested */}
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes float {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(-10px); }
                }
              `}} />
              
              <div className="grid grid-cols-2 gap-4">
                 {['Data Structures', 'Machine Learning', 'Cloud Computing', 'Database Systems'].map((sub, i) => (
                    <div key={i} className="rounded-[12px] bg-white p-[16px] text-[13px] font-medium text-[#0f172a] shadow-sm border border-slate-100 flex items-center justify-center text-center lg:min-h-[80px]">
                       {sub}
                    </div>
                 ))}
              </div>
              
              {/* Verified Badge */}
              <div className="mt-6 flex justify-center">
                 <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 border border-emerald-100">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Verified by Faculty
                 </div>
              </div>
           </div>
        </div>

      </div>

      {/* 32px gradient fade into next section */}
      <div className="absolute bottom-0 left-0 w-full h-[32px] bg-gradient-to-t from-white to-transparent z-20 pointer-events-none" />
    </section>
  )
}
