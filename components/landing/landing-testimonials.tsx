import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

const testimonials = [
  {
    quote:
      "TaskMaster AI has completely transformed how I manage my coursework. I've improved my grades and reduced stress.",
    name: "Alex Johnson",
    role: "Computer Science Student",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    quote:
      "The Pomodoro timer and task management features work seamlessly together. My productivity has increased by at least 30%.",
    name: "Sam Taylor",
    role: "Graduate Researcher",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    quote:
      "As a professor, I recommend TaskMaster AI to all my students. It helps them stay organized and focused on what matters.",
    name: "Dr. Jordan Lee",
    role: "University Professor",
    avatar: "/placeholder.svg?height=40&width=40",
  },
]

export function LandingTestimonials() {
  return (
    <section id="testimonials" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Loved by Students and Professionals</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Join thousands of users who have transformed their productivity with TaskMaster AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <p className="text-zinc-300 italic">"{testimonial.quote}"</p>
              </CardContent>
              <CardFooter className="border-t border-zinc-800 pt-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                    <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{testimonial.name}</p>
                    <p className="text-sm text-zinc-500">{testimonial.role}</p>
                  </div>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

