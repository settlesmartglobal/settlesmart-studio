export type MetaConnection = {
  provider: "meta";
  status: "CONNECTED" | "NOT_CONNECTED" | "CONFIGURATION_REQUIRED";
  facebookPageId?: string;
  facebookPageName?: string;
  instagramAccountId?: string;
  instagramUsername?: string;
  encryptedAccessToken?: string;
  expiresAt?: string | null;
  grantedScopes?: string[];
  lastVerifiedAt?: string;
};

export type PublishInput = {
  companyId: string;
  campaignId?: string;
  mediaAssetId: string;
  platforms: Array<"INSTAGRAM" | "FACEBOOK">;
  caption: string;
  hashtags?: string;
  scheduledAt?: string;
  forceNow?: boolean;
};
