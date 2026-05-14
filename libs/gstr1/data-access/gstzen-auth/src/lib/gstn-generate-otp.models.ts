/** Request body for GSTZen GSTN Generate OTP (`POST`). */
export interface GstnGenerateOtpRequestBody {
  readonly gstin: string;
  readonly username: string;
}

/** Request body for GSTZen GSTN Establish Session (`POST`). */
export interface GstnEstablishSessionRequestBody {
  readonly gstin: string;
  readonly otp: string;
}
