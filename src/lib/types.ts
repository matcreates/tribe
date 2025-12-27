export interface TribeSettings {
  tribeName: string;
  slug: string;
  ownerName: string;
  ownerAvatar?: string;
}

export interface Subscriber {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface SentEmail {
  id: string;
  subject: string;
  body: string;
  sentAt: string;
  recipientCount: number;
}

export interface TribeData {
  settings: TribeSettings;
  subscribers: Subscriber[];
  sentEmails: SentEmail[];
}

