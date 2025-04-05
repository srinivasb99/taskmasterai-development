import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

export const metadata: Metadata = {
  title: "Pricing | TaskMaster AI",
  description: "Choose the right plan for your productivity needs",
}

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    description: "Basic productivity tools for individuals",
    features: [
      "Basic task management",
      "Simple Pomodoro timer",
      "Calendar view",
      "Limited AI assistance",
      "1 workspace",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Student",
    price: "$4.99",
    period: "/month",
    description: "Enhanced tools for students and academics",
    features: [
      "Advanced task management",
      "Multiple Pomodoro timers",
      "AI productivity assistant",
      "Group chat & collaboration",
      "File sharing",
      "3 workspaces",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Professional",
    price: "$9.99",
    period: "/month",
    description: "Complete solution for professionals",
    features: [
      "Everything in Student",
      "Advanced analytics",
      "API integrations",
      "Priority support",
      "Custom templates",
      "Unlimited workspaces",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
]

export default function PricingPage() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto">
            Choose the plan that's right for you and start boosting your productivity today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <div
              key={index}
              className={`
                rounded-lg border border-zinc-800 bg-zinc-900 p-8 relative
                ${plan.popular ? "md:scale-105 md:-my-4 shadow-lg" : ""}
              `}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-0 right-0 mx-auto w-fit px-3 py-1 bg-zinc-800 rounded-full text-xs font-medium">
                  Most Popular
                </div>
              )}

              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-baseline mb-6">
                <p className="text-3xl font-bold">{plan.price}</p>
                {plan.period && <span className="text-sm font-normal text-zinc-400">{plan.period}</span>}
              </div>
              <p className="text-zinc-400 mb-6">{plan.description}</p>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href="/signup">
                <Button variant={plan.popular ? "default" : "outline"} className="w-full">
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6 mt-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-medium mb-2">Can I switch plans later?</h3>
              <p className="text-zinc-400">
                Yes, you can upgrade or downgrade your plan at any time. Changes will be applied at the start of your
                next billing cycle.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-medium mb-2">Is there a free trial?</h3>
              <p className="text-zinc-400">
                Yes, both the Student and Professional plans come with a 14-day free trial. No credit card required.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-medium mb-2">Do you offer educational discounts?</h3>
              <p className="text-zinc-400">
                Yes, we offer additional discounts for educational institutions. Contact our sales team for more
                information.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-medium mb-2">How do I cancel my subscription?</h3>
              <p className="text-zinc-400">
                You can cancel your subscription at any time from your account settings. Your access will continue until
                the end of your current billing period.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

