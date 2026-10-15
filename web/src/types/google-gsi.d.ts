// Minimal types for the parts of Google Identity Services we use.
// https://developers.google.com/identity/gsi/web/reference/js-reference

interface GoogleCredentialResponse {
  /** The ID token (JWT) the API verifies. */
  credential: string;
  select_by?: string;
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  ux_mode?: "popup" | "redirect";
  context?: "signin" | "signup" | "use";
  auto_select?: boolean;
  itp_support?: boolean;
  use_fedcm_for_button?: boolean;
}

interface GoogleButtonConfiguration {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
  locale?: string;
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: GoogleIdConfiguration) => void;
        renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void;
        disableAutoSelect: () => void;
      };
    };
  };
}
