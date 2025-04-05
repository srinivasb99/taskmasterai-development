import { Calendar, CheckCircle, Clock, BarChart, MessageSquare, BrainCircuit } from "lucide-react"

const features = [
  {
    icon: BarChart,
    title: "Smart Dashboard",
    description: "Track your productivity with visual progress indicators and goal tracking.",
  },
  {
    icon: CheckCircle,
    title: "Intelligent Task Management",
    description: "Create, organize, and prioritize tasks with AI-powered suggestions.",
  },
  {
    icon: Calendar,
    title: "Calendar Integration",
    description: "Visualize your schedule and never miss important deadlines.",
  },
  {
    icon: Clock,
    title: "Pomodoro Technique",
    description: "Optimize your focus with customizable Pomodoro timers.",
  },
  {
    icon: MessageSquare,
    title: "Collaborative Chat",
    description: "Communicate with study groups or team members in real-time.",
  },
  {
    icon: BrainCircuit,
    title: "AI Assistant",
    description: "Get personalized productivity tips and answers to your questions.",
  },
]

export function LandingFeatures() {
  return (
    <section id="features" className="py-20 bg-zinc-950">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Excel</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            TaskMaster AI combines powerful productivity tools with artificial intelligence to help you achieve more.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-zinc-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

