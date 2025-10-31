"""
PayPal Invoices SDK (minimal, production-ready)

This module provides a small Python client for the PayPal Invoices API with:
- Functions to create, send, and cancel invoices
- Robust error handling that surfaces PayPal error details
- Exponential backoff with jitter for HTTP 429 (rate limiting), honoring Retry-After
- Type hints and comprehensive docstrings

Only dependency: requests
"""
from __future__ import annotations

import json as _json
import random
import time
from typing import Any, Dict, Optional

import requests


class PayPalAPIError(Exception):
    """Raised for 4xx/5xx responses from PayPal APIs with structured details.

    Attributes:
        status_code: HTTP status code returned by the API.
        error: Short error name/code if available (e.g., from PayPal's `name`).
        message: Human-readable message if available (e.g., from PayPal's `message`).
        details: Additional error details from the response (list or dict), if any.
        headers: Response headers for debugging and context.
        body: Raw response body (string) for troubleshooting when JSON parsing fails.
    """

    def __init__(
        self,
        status_code: int,
        error: Optional[str] = None,
        message: Optional[str] = None,
        details: Optional[Any] = None,
        headers: Optional[Dict[str, Any]] = None,
        body: Optional[str] = None,
    ) -> None:
        self.status_code = status_code
        self.error = error
        self.message = message
        self.details = details
        self.headers = dict(headers or {})
        self.body = body
        super().__init__(self.__str__())

    def __str__(self) -> str:  # pragma: no cover - human-readable formatting
        parts = [f"HTTP {self.status_code}"]
        if self.error:
            parts.append(f"name={self.error}")
        if self.message:
            parts.append(f"message={self.message}")
        if self.details:
            try:
                parts.append(f"details={_json.dumps(self.details, ensure_ascii=False)}")
            except Exception:
                parts.append("details=<unserializable>")
        return "; ".join(parts)


class RateLimitError(PayPalAPIError):
    """Raised when rate limit retries are exhausted for HTTP 429 responses."""


class PayPalInvoicesClient:
    """Minimal PayPal Invoices API client.

    Example:
        >>> client = PayPalInvoicesClient(access_token="ACCESS_TOKEN")
        >>> invoice = client.create_invoice({"detail": {"currency_code": "USD"}})
        >>> client.send_invoice(invoice["id"])  # doctest: +SKIP
        >>> client.cancel_invoice(invoice["id"])  # doctest: +SKIP

    Note: Provide a production base URL to use live environment:
        base_url='https://api-m.paypal.com'
    """

    def __init__(
        self,
        access_token: str,
        base_url: str = "https://api-m.sandbox.paypal.com",
        timeout: int = 30,
        user_agent: Optional[str] = None,
    ) -> None:
        """Initialize the client.

        Args:
            access_token: OAuth2 access token (Bearer). Obtain via PayPal OAuth2.
            base_url: API base URL. Defaults to PayPal Sandbox. For production,
                use 'https://api-m.paypal.com'.
            timeout: Per-request timeout in seconds.
            user_agent: Optional custom User-Agent header value.
        """
        if not access_token:
            raise ValueError("access_token is required")
        if not base_url.startswith("http"):
            raise ValueError("base_url must be a full URL including scheme")
        self._access_token = access_token
        self._base_url = base_url.rstrip("/")
        self._timeout = int(timeout)
        self._user_agent = user_agent or "paypal-invoices-sdk/0.1 (+https://developer.paypal.com/)"

        # Retry configuration
        self._max_retries_429 = 5
        self._base_backoff = 0.5  # seconds
        self._max_backoff = 10.0  # seconds

    def _headers(self, request_id: Optional[str] = None) -> Dict[str, str]:
        """Return default headers for PayPal API requests.

        Includes Authorization, Content-Type, and optionally PayPal-Request-Id
        to enable idempotency on create/send/cancel operations.

        Args:
            request_id: Optional unique idempotency key (PayPal-Request-Id).

        Returns:
            Dictionary of headers.
        """
        headers = {
            "Authorization": f"Bearer {self._access_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": self._user_agent,
        }
        if request_id:
            headers["PayPal-Request-Id"] = request_id
        return headers

    def _request(
        self,
        method: str,
        path: str,
        *,
        json: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Make an HTTP request and handle errors and rate limits.

        Handles:
        - 2xx: returns parsed JSON (dict). Empty bodies -> {}.
        - 429: exponential backoff with jitter, honoring Retry-After seconds if present.
        - 4xx/5xx: raises PayPalAPIError with parsed name/message/details when available.

        Args:
            method: HTTP method (GET, POST, etc.).
            path: Path starting with '/'.
            json: Optional JSON body to send.
            request_id: Optional idempotency key (PayPal-Request-Id header).

        Returns:
            Parsed JSON response as a dict.

        Raises:
            RateLimitError: When 429 persists after retries.
            PayPalAPIError: For other 4xx/5xx responses or parsing issues.
        """
        if not path.startswith("/"):
            raise ValueError("path must start with '/'")
        url = f"{self._base_url}{path}"
        headers = self._headers(request_id=request_id)

        attempt = 0
        while True:
            attempt += 1
            try:
                resp = requests.request(
                    method=method.upper(),
                    url=url,
                    headers=headers,
                    json=json,
                    timeout=self._timeout,
                )
            except requests.RequestException as exc:
                # Network or transport error -> represent as 0 with message
                raise PayPalAPIError(
                    status_code=0,
                    error="REQUEST_EXCEPTION",
                    message=str(exc),
                    details=None,
                    headers=None,
                ) from exc

            # Success path
            if 200 <= resp.status_code < 300:
                if resp.content and resp.content.strip():
                    try:
                        return resp.json()
                    except ValueError:
                        # Non-JSON success payload
                        return {"raw": resp.text}
                return {}

            # Rate-limit handling
            if resp.status_code == 429:
                if attempt > self._max_retries_429:
                    # Extract error details before raising
                    err = self._parse_error(resp)
                    raise RateLimitError(
                        status_code=resp.status_code,
                        error=err.get("name"),
                        message=err.get("message"),
                        details=err.get("details"),
                        headers=dict(resp.headers),
                        body=err.get("raw"),
                    )
                # Honor Retry-After header (seconds), otherwise exponential backoff with jitter
                retry_after_hdr = resp.headers.get("Retry-After")
                if retry_after_hdr and retry_after_hdr.isdigit():
                    wait = float(retry_after_hdr)
                else:
                    # Exponential backoff with jitter, capped
                    base = min(self._max_backoff, self._base_backoff * (2 ** (attempt - 1)))
                    wait = base + random.uniform(0, 0.25 * base)
                time.sleep(wait)
                continue

            # Other error statuses -> raise rich error
            err = self._parse_error(resp)
            raise PayPalAPIError(
                status_code=resp.status_code,
                error=err.get("name"),
                message=err.get("message"),
                details=err.get("details"),
                headers=dict(resp.headers),
                body=err.get("raw"),
            )

    @staticmethod
    def _parse_error(resp: requests.Response) -> Dict[str, Any]:
        """Parse PayPal-style error body into a consistent structure.

        PayPal commonly returns JSON with fields like `name`, `message`, `details`.
        This helper makes best-effort to extract those. If JSON parsing fails,
        it returns the raw text under 'raw'.
        """
        try:
            data = resp.json()
            # Normalize to dict shape
            name = data.get("name") if isinstance(data, dict) else None
            message = data.get("message") if isinstance(data, dict) else None
            details = data.get("details") if isinstance(data, dict) else None
            return {"name": name, "message": message, "details": details}
        except ValueError:
            return {"raw": resp.text}

    # Public API methods
    def create_invoice(self, invoice: Dict[str, Any], request_id: Optional[str] = None) -> Dict[str, Any]:
        """Create a draft invoice.

        Args:
            invoice: Invoice payload per PayPal Invoicing API. At minimum, include
                required fields such as detail, invoicer, primary_recipients, and items.
            request_id: Optional idempotency key (PayPal-Request-Id).

        Returns:
            The created invoice resource as a dict. Includes fields such as id, status, links.
        """
        return self._request("POST", "/v2/invoicing/invoices", json=invoice, request_id=request_id)

    def send_invoice(
        self,
        invoice_id: str,
        notify_merchant: bool = False,
        subject: Optional[str] = None,
        note: Optional[str] = None,
        send_to_recipient: bool = True,
        send_to_invoicer: bool = False,
        request_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send an invoice by ID.

        Args:
            invoice_id: PayPal invoice ID to send.
            notify_merchant: If true, send a notification to the merchant.
            subject: Optional email subject to the recipient.
            note: Optional note/message body for the recipient.
            send_to_recipient: Whether to send to the recipient (default True).
            send_to_invoicer: Whether to send a copy to the invoicer.
            request_id: Optional idempotency key (PayPal-Request-Id).

        Returns:
            The updated invoice resource or an operation result depending on API response.
        """
        body: Dict[str, Any] = {
            "send_to_recipient": send_to_recipient,
            "send_to_invoicer": send_to_invoicer,
        }
        # PayPal allows additional parameters such as subject, note, and notify_merchant
        if subject is not None:
            body["subject"] = subject
        if note is not None:
            body["note"] = note
        if notify_merchant is not None:
            body["notify_merchant"] = notify_merchant

        path = f"/v2/invoicing/invoices/{invoice_id}/send"
        return self._request("POST", path, json=body, request_id=request_id)

    def cancel_invoice(
        self,
        invoice_id: str,
        subject: Optional[str] = None,
        note: Optional[str] = None,
        send_to_recipient: bool = True,
        send_to_invoicer: bool = False,
        request_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Cancel a sent invoice by ID.

        Args:
            invoice_id: PayPal invoice ID to cancel.
            subject: Optional subject for the cancellation notification.
            note: Optional note/message body explaining the cancellation.
            send_to_recipient: Whether to notify the recipient.
            send_to_invoicer: Whether to notify the invoicer.
            request_id: Optional idempotency key (PayPal-Request-Id).

        Returns:
            Operation result or updated invoice resource depending on API response.
        """
        body: Dict[str, Any] = {
            "send_to_recipient": send_to_recipient,
            "send_to_invoicer": send_to_invoicer,
        }
        if subject is not None:
            body["subject"] = subject
        if note is not None:
            body["note"] = note

        path = f"/v2/invoicing/invoices/{invoice_id}/cancel"
        return self._request("POST", path, json=body, request_id=request_id)
