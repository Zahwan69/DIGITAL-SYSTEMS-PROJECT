import Link from "next/link";
import { BarChart3, Building2, FileUp, GraduationCap, SearchCheck, Users } from "lucide-react";

import { Hoverable, HoverableGroup } from "@/components/effects/Hoverable";
import { HeroBanner } from "@/components/landing/HeroBanner";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { ThemedLandingImage } from "@/components/landing/ThemedLandingImage";
import { Button } from "@/components/ui/button";
import Carousel from "@/components/ui/carousel";

const features = [
  {
    title: "Past papers become practice sessions",
    body: "Upload or find a paper, then move through questions in a focused workspace built for revision.",
    image: "/images/landing/feature-upload.png",
    darkImage: "/images/landing/feature-upload-dark.png",
    Icon: FileUp,
  },
  {
    title: "Feedback explains the next step",
    body: "See marks, strengths, missing points, and model answers that make the correction process clearer.",
    image: "/images/landing/feature-grading.png",
    darkImage: "/images/landing/feature-grading-dark.png",
    Icon: SearchCheck,
  },
  {
    title: "Progress stays visible",
    body: "XP, levels, streaks, and weak topics turn repeated practice into a pattern you can understand.",
    image: "/images/landing/feature-progress.png",
    darkImage: "/images/landing/feature-progress-dark.png",
    Icon: BarChart3,
  },
];

const howItWorksSlides = [
  {
    title: "Find a paper",
    button: "Search by syllabus code or upload a PDF you already have.",
    src: "/images/landing/feature-upload.png",
  },
  {
    title: "Answer naturally",
    button: "Type your answer or attach a photo of handwritten work.",
    src: "/images/landing/hero.png",
  },
  {
    title: "Understand feedback",
    button: "See marks, missing points, strengths, and a model answer.",
    src: "/images/landing/feature-grading.png",
  },
  {
    title: "Track progress",
    button: "Build XP, levels, streaks, and a clearer view of weak topics.",
    src: "/images/landing/feature-progress.png",
  },
];

const audiences = [
  {
    title: "For students",
    body: "Practise O Level and A Level style questions, understand what was missing, and build confidence before exam season.",
    Icon: GraduationCap,
  },
  {
    title: "For teachers",
    body: "Create classes, invite learners, set paper-based practice, and see where students are struggling without marking every answer manually.",
    Icon: Users,
  },
  {
    title: "For schools",
    body: "Support structured revision across classes with a shared workspace for past-paper practice, feedback, and progress visibility.",
    Icon: Building2,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-bg text-text">
      <LandingHeader />
      <HeroBanner />

      <section className="mx-auto max-w-7xl px-6 py-28">
        <div className="mb-12 max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-wide text-text-muted">What StudyAI gives you</p>
          <h2 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-text md:text-[48px]">
            A clearer loop for exam practice.
          </h2>
          <p className="mt-5 text-base leading-[1.65] text-text-muted">
            StudyAI keeps the practice flow simple: choose a paper, answer naturally, learn from feedback, and return to
            the topics that need work.
          </p>
        </div>
        <HoverableGroup className="grid-cols-1 md:grid-cols-3">
          {features.map(({ title, body, image, darkImage, Icon }) => (
            <Hoverable key={title} className="p-4">
              <ThemedLandingImage
                src={image}
                darkSrc={darkImage}
                width={480}
                height={360}
                className="aspect-[4/3] overflow-hidden rounded-xl bg-surface-alt"
              />
              <Icon className="mt-6 h-6 w-6 text-text" strokeWidth={1.5} aria-hidden />
              <h2 className="mt-4 text-[28px] font-semibold leading-tight tracking-[-0.01em] text-text">{title}</h2>
              <p className="mt-3 text-base leading-[1.65] text-text-muted">{body}</p>
            </Hoverable>
          ))}
        </HoverableGroup>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-28">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-text-muted">Built for classrooms too</p>
            <h2 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-text md:text-[48px]">
              Useful for learners, teachers, and schools.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-[1.65] text-text-muted">
              StudyAI is not only a solo revision tool. It also gives teachers and schools a clearer way to organise
              O Level and A Level past-paper practice across classes.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-alt p-6">
            <p className="text-sm font-medium uppercase tracking-wide text-text-muted">Classroom workflow</p>
            <div className="mt-5 grid gap-3 text-sm text-text-muted sm:grid-cols-3">
              {["Create classes", "Invite students", "Review progress"].map((item) => (
                <div key={item} className="rounded-xl border border-border bg-surface p-4 text-text">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <HoverableGroup className="mt-12 grid-cols-1 md:grid-cols-3">
          {audiences.map(({ title, body, Icon }) => (
            <Hoverable key={title} className="p-6">
              <Icon className="h-6 w-6 text-text" strokeWidth={1.5} aria-hidden />
              <h3 className="mt-5 text-[28px] font-semibold leading-tight tracking-[-0.01em] text-text">{title}</h3>
              <p className="mt-3 text-base leading-[1.65] text-text-muted">{body}</p>
            </Hoverable>
          ))}
        </HoverableGroup>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-28">
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wide text-text-muted">How it works</p>
          <h2 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-text md:text-[48px]">
            From first question to clearer revision.
          </h2>
        </div>
        <Carousel slides={howItWorksSlides} />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-28 text-center">
        <ThemedLandingImage
          src="/images/landing/closing.png"
          darkSrc="/images/landing/closing-dark.png"
          width={1200}
          height={600}
          className="mx-auto aspect-[2/1] w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-surface-alt"
        />
        <h2 className="mt-14 text-[44px] font-semibold leading-[1.05] tracking-[-0.025em] text-text md:text-[72px]">
          Start your first paper.
        </h2>
        <div className="mt-8 flex justify-center">
          <Button asChild size="lg">
            <Link href="/auth/signup">Get started free</Link>
          </Button>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
