import { Container } from "@/components/layout/container";

type AuthShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="bg-brand-soft flex-1">
      <Container className="flex justify-center py-10 sm:py-16">
        <div className="w-full max-w-md">
          <div className="border-line shadow-soft rounded-xl border bg-white p-6 sm:p-8">
            <h1 className="text-brand-dark text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-ink-muted mt-1 text-sm">{description}</p>
            <div className="mt-6">{children}</div>
          </div>
          {footer ? (
            <div className="text-ink-muted mt-4 text-center text-sm">{footer}</div>
          ) : null}
        </div>
      </Container>
    </div>
  );
}
