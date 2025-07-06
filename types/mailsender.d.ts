declare module 'mailsender' {
  interface MailOptions {
    from: string;
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
  }

  interface SendResult {
    messageId: string;
  }

  interface MailsenderConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  }

  function mailsender(config: MailsenderConfig): {
    send(options: MailOptions): Promise<SendResult>;
  };

  export = mailsender;
} 