import Image from "next/image"

export function ProblemSection() {
  return (
    <section className="py-20 w-full bg-white">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 md:px-8 text-center">

        <div className="flex justify-center">
          <Image
            src="/images/problem-banner.jpg"
            alt="Students struggling to find resources"
            width={960}
            height={386}
            className="w-full h-auto object-cover rounded-2xl shadow-xl"
            loading="lazy"
            sizes="(max-width: 768px) 100vw, 80vw"
          />
        </div>

      </div>
    </section>
  )
}


