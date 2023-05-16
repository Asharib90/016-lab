/**
 * Configuration data for the app.
 */
export interface ConfigData {
  env: string;

  /** The port number of the http server to listen on. */
  port: number;

  /**
   * The log level to use.
   * @example 'verbose', 'info', 'warn', 'error'
   */
  logLevel: string;

  jwtSecret: string;
  refreshSecret: string;
  cookieSecret: string;
  transactionSecret: string;

  /** Database connection details. */

  databaseType: string;
  o16labsDatabaseURI: string;

  //* Duration of the token and cookie in  minutes
  tokenExpiresDurationInMinutesForClient: number;
  cacheExpiresDurationInMinutes: number;
  refreshExpiresDurationInYears: number;
}
