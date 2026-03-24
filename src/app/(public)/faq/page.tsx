import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

export const metadata = {
  title: "FAQ — SheepDog Society",
  description: "Frequently asked questions about Sheepdog Society — what we do, how to join, and how groups work.",
};

const faqs = [
  {
    q: "What is the Sheepdog mission?",
    a: "Our mission comes from Acts 20:28 — to keep watch over ourselves and the flock God has entrusted to us. We exist to transform men through Scripture, brotherhood, and accountability. We gather in small groups to study God's Word, sharpen one another, and live out our calling as protectors of our families, churches, and communities.",
  },
  {
    q: "Is Sheepdog really free?",
    a: "Yes, always. Sheepdog Society is completely free and will always be. No membership fees, no dues, no hidden costs. This brotherhood is a gift, not a product. We believe that access to fellowship and Scripture study should never have a price tag.",
  },
  {
    q: "How do I find a location?",
    a: "Visit our Locations page to see an interactive map of all active Sheepdog groups. You can search by city, state, or zip code to find a group near you. If there's no group in your area, you can request to start one.",
  },
  {
    q: "What do I need to do to join or visit a group?",
    a: "Just show up. That's it. No application, no prerequisites, no interview. Every group is open to all men. Come as you are — whether you've been walking with Christ for decades or are just curious about faith.",
  },
  {
    q: "Do you have any guidelines for leading a study?",
    a: "Yes. Leadership is simple and peer-driven. Any man can lead. Read the passage aloud together — each man takes a turn reading. Discuss what stood out, ask questions, and share how it applies to your life. Keep conversations focused on Scripture and everyday issues men face. Avoid controversy, other churches' problems, and complicated theological debates. End with a Circle of Prayer (COP).",
  },
  {
    q: "Can we do a workout or bootcamp and a study?",
    a: "Absolutely. Some groups pair physical training with their study. The key is that Scripture study and the Circle of Prayer remain the foundation of every gathering. A workout is a great addition, not a replacement.",
  },
  {
    q: "How do I start a group in my area or church?",
    a: "Visit our 'Start a Group' page and fill out the request form. We'll schedule a video call to walk you through the process, share resources, and help you launch. You can start a group through a church, an existing men's group, in your community, at a school or college, or through an athletic team.",
  },
  {
    q: "When should we meet?",
    a: "Whatever works best for your group. Most groups meet early morning before work, during lunch, or on weekends. Consistency is key — pick a day and time and stick with it. Weekly meetings are the standard.",
  },
  {
    q: "What should we discuss?",
    a: "Start with Scripture. Use our study guides or follow a book of the Bible together. Focus on everyday issues men face — being a better husband, father, leader, and servant. Keep it real, keep it practical, keep it Christ-centered. Steer away from controversy and stick to what helps men grow.",
  },
  {
    q: "Where can we get references and study guides?",
    a: "Check our Resources page for study guides at three levels — entry, mid, and advanced. We provide single studies and multi-week series, book references, and Bible reading plans. New resources are added regularly.",
  },
  {
    q: "Is it okay to use personal study guides and references?",
    a: "Yes! We encourage it. If you find a great study guide or reference, use it with your group. Even better — send it to us so we can share it with other groups. The more resources we have, the more men benefit.",
  },
  {
    q: "What is the Circle of Prayer (COP)?",
    a: "The COP is how every Sheepdog gathering ends. Men stand together in a circle and pray — for each other, for their families, for their communities. It's a time of vulnerability, trust, and lifting one another before God. What's shared in the COP stays in the COP. Confidentiality is sacred.",
  },
];

export default function FAQPage() {
  return (
    <>
      <section className="bg-card px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <HelpCircle className="mx-auto mb-4 h-10 w-10 text-bronze" />
          <h1 className="text-3xl font-bold sm:text-4xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-2 text-muted-foreground">
            Everything you need to know about Sheepdog Society.
          </p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-lg border border-border px-4"
              >
                <AccordionTrigger className="text-left font-medium">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </>
  );
}
