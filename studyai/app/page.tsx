import { BarChart3, Building2, CheckCircle2, FileUp, GraduationCap, Users } from "lucide-react";

import { Hoverable, HoverableGroup } from "@/components/effects/Hoverable";
import { HeroBanner } from "@/components/landing/HeroBanner";
import { LandingCTA } from "@/components/landing/LandingCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { ThemedLandingImage } from "@/components/landing/ThemedLandingImage";
import Carousel from "@/components/ui/carousel";

const features = [
  {
    title: "QP and MS files become practice sessions",
    body: "Upload a question paper with its mark scheme, then move through questions in a focused revision workspace.",
    image: "/images/landing/upload-qp-ms.png",
    darkImage: "/images/landing/upload-qp-ms.png",
    Icon: FileUp,
  },
  {
    title: "Feedback explains the next step",
    body: "See marks, strengths, missing points, and model answers that make the correction process clearer.",
    image: "/images/landing/feedback-workspace.png",
    darkImage: "/images/landing/feedback-workspace.png",
    Icon: CheckCircle2,
  },
  {
    title: "Progress stays visible",
    body: "XP, levels, streaks, and weak topics turn repeated practice into a pattern you can understand.",
    image: "/images/landing/student-progress.png",
    darkImage: "/images/landing/student-progress.png",
    Icon: BarChart3,
  },
];

const howItWorksSlides = [
  {
    title: "Upload QP and MS",
    button: "Start with your question paper PDF and add the matching mark scheme.",
    src: "/images/landing/upload-qp-ms.png",
  },
  {
    title: "Answer naturally",
    button: "Type your answer or attach a photo of handwritten work.",
    src: "/images/landing/paper-practice.png",
  },
  {
    title: "Understand feedback",
    button: "See marks, missing points, strengths, and a model answer.",
    src: "/images/landing/feedback-workspace.png",
  },
  {
    title: "Track progress",
    button: "Build XP, levels, streaks, and a clearer view of weak topics.",
    src: "/images/landing/student-progress.png",
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
            StudyAI keeps the practice flow simple: upload a QP/MS pair, answer naturally, learn from feedback, and
            return to the topics that need work.
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
          <ThemedLandingImage
            src="/images/landing/teacher-classroom.png"
            darkSrc="/images/landing/teacher-classroom.png"
            width={1600}
            height={1168}
            className="aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-surface-alt"
          />
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

      <LandingCTA />

      <LandingFooter />
    </main>
  );
}
