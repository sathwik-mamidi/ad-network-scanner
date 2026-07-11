# Security policy

## Reporting a vulnerability

Please report suspected vulnerabilities through GitHub's
[private vulnerability reporting](https://github.com/sathwik-mamidi/ad-network-scanner/security/advisories/new)
instead of a public issue. Include reproduction steps, the affected version,
and the expected impact. Use non-sensitive sample domains and output data.

Security fixes are applied to the latest code on the default branch.

## Security boundaries

The scanner opens untrusted websites in an automated browser. Run it in an
isolated environment, keep Chromium current, and do not reuse a personal browser
profile. The `--disable-browser-sandbox` option weakens browser isolation and
should only be used inside another trusted sandbox.
