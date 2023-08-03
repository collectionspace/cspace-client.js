# Change Log

## v2.0.0

v2.0.0 adds support for the OAuth 2 authorization code grant, used by CollectionSpace 8.0.

### Breaking Changes

- The session login method now issues a request for a token using the OAuth 2 authorization code grant, instead of the password grant. This requires a CollectionSpace 8.0 server. A login attempt to an older CollectionSpace server will fail.
