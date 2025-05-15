import StoryFeature from "@/components/story-feature"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8">24hr Stories</h1>
      <StoryFeature />
    </main>
  )
}
