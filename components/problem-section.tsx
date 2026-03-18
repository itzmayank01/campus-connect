import Image from "next/image"

export function ProblemSection() {
  return (
    <section className="px-6 py-20 bg-white">
      <div className="mx-auto max-w-6xl text-center">

        <div className="flex justify-center">
          <Image
            src="/images/problem-banner.jpg"
            alt="Students struggling to find resources"
            width={960}
            height={386}
            className="rounded-2xl shadow-xl"
            loading="lazy"
            sizes="(max-width: 768px) 100vw, 80vw"
          />
        </div>

      </div>
    </section>
  )
}


