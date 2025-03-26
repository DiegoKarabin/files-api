export interface SendTemplatedEmailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}
