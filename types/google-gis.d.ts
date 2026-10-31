/**
 * Minimal type declarations for the Google Identity Services (GIS) SDK.
 * The full SDK is loaded via the <script> tag in layout.tsx.
 */

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }): void;
  prompt(momentListener?: (notification: {
    isNotDisplayed(): boolean;
    isSkippedMoment(): boolean;
    isDismissedMoment(): boolean;
    getNotDisplayedReason(): string;
    getSkippedReason(): string;
    getDismissedReason(): string;
  }) => void): void;
  cancel(): void;
}

interface Google {
  accounts: {
    id: GoogleAccountsId;
  };
}

declare global {
  interface Window {
    google?: Google;
  }
}

export {};
