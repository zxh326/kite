package i18n

type Errors struct {
	InvalidPayload        string `json:"invalid_payload"`
	InvalidCredentials    string `json:"invalid_credentials"`
	JWTGenerationFailed   string `json:"jwt_generation_failed"`
	AuthCodeMissing       string `json:"auth_code_missing"`
	ProviderNotFound      string `json:"provider_not_found"`
	Unauthenticated       string `json:"unauthenticated"`
	NoTokenProvided       string `json:"no_token_provided"`
	InvalidHeaderFormat   string `json:"invalid_header_format"`
	TokenInvalidOrExpired string `json:"token_invalid_or_expired"`
	TokenValidationFailed string `json:"token_validation_failed"`
	TokenNotFound         string `json:"token_not_found"`
	TokenRefreshFailed    string `json:"token_refresh_failed"`
}

type Locales struct {
	Errors Errors `json:"errors"`
}
