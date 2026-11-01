import { AuthGate } from "@/components/auth-gate";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/codelit/button";

const CHANNELS = [
  {
    title: "Documentation",
    body: "Our documentation contains tutorials on how to do everything in CourseLit.",
    href: "https://docs.courselit.app",
    action: "See documentation",
  },
  {
    title: "Ask in Discord",
    body: "Come ask your questions directly from the team. We are quite active there.",
    href: "https://discord.com/invite/GR4bQsN",
    action: "Open Discord",
  },
  {
    title: "Found a bug?",
    body: "We encourage you to raise an issue so that we can make the product better for everyone.",
    href: "https://discord.com/channels/727630561895514212/1244954638747303946",
    action: "Post an issue",
  },
];

export default function SupportPage() {
  return (
    <AuthGate>
      <main className="page-shell">
        <PageHeader
          title="Support"
          description="If you need a helping hand, we are out there for you."
        />
        <section className="grid gap-4 lg:grid-cols-3">
          {CHANNELS.map((channel) => (
            <Card key={channel.title}>
              <CardHeader>
                <CardTitle>{channel.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{channel.body}</p>
              </CardContent>
              <CardFooter>
                <Button asChild variant="secondary">
                  <a href={channel.href} target="_blank" rel="noreferrer">
                    {channel.action}
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </section>
        <section>
          <h2 className="text-lg font-semibold">Priority support</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            In case you need to get in touch with the team to get help faster, we offer{" "}
            <strong>paid</strong> support. Please reach out to us on{" "}
            <a href="mailto:support@courselit.app" className="underline">
              CourseLit Support
            </a>{" "}
            with your requirements.
          </p>
        </section>
      </main>
    </AuthGate>
  );
}
