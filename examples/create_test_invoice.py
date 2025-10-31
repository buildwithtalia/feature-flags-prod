#!/usr/bin/env python3
"""
Example script: Create, send, and then cancel a PayPal invoice using a minimal SDK.

Requirements:
- Environment variables:
  * PAYPAL_CLIENT_ID
  * PAYPAL_CLIENT_SECRET
  * Optional: PAYPAL_BASE_URL (default: https://api-m.sandbox.paypal.com)
- Only dependency: requests

This script performs:
1) OAuth2 Client Credentials to obtain an access token
2) Instantiate PayPalInvoicesClient
3) Create a draft invoice
4) Send the invoice
5) Cancel the invoice (immediately) to demonstrate cancel flow

Note: In production, you should not usually cancel an invoice immediately after sending.
"""
from __future__ import annotations

import base64
import os
import sys
from pathlib import Path
from typing import Any, Dict

import requests
from dotenv import load_dotenv

# Add parent directory to path to import the SDK
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

from paypal_invoices_sdk import (
    PayPalInvoicesClient,
    PayPalAPIError,
    RateLimitError,
)


def get_access_token(base_url: str, client_id: str, client_secret: str) -> str:
    """Obtain OAuth2 access token via client_credentials grant.

    Args:
        base_url: PayPal API base URL.
        client_id: OAuth2 client id.
        client_secret: OAuth2 client secret.

    Returns:
        Access token string.

    Raises:
        SystemExit: If the token request fails.
    """
    token_url = base_url.rstrip("/") + "/v1/oauth2/token"

    # Basic auth header
    basic = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    headers = {
        "Authorization": f"Basic {basic}",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
    }

    data = {"grant_type": "client_credentials"}
    try:
        resp = requests.post(token_url, headers=headers, data=data, timeout=30)
    except requests.RequestException as exc:
        print(f"Error requesting access token: {exc}")
        raise SystemExit(1)

    if resp.status_code != 200:
        print(f"Failed to obtain access token. HTTP {resp.status_code}: {resp.text}")
        raise SystemExit(1)

    token_payload = resp.json()
    access_token = token_payload.get("access_token")
    if not access_token:
        print("Access token missing in response.")
        raise SystemExit(1)
    return access_token


def build_minimal_invoice() -> Dict[str, Any]:
    """Build a minimal valid invoice payload for testing purposes.

    Returns:
        Dict representing an invoice payload compatible with PayPal Invoicing API.
    """
    return {
        "detail": {
            "currency_code": "USD",
            "note": "Test invoice created by example script.",
        },
        "invoicer": {
            # Supply your invoicer info as appropriate; email_address typically derived from your PayPal account
            # You can set business_name, address, etc., if needed.
        },
        "primary_recipients": [
            {
                "billing_info": {
                    # Replace with a valid recipient email you control for sandbox testing
                    "email_address": "buyer@example.com",
                }
            }
        ],
        "items": [
            {
                "name": "Test Item",
                "quantity": "1",
                "unit_amount": {"currency_code": "USD", "value": "5.00"},
            }
        ],
    }


def main() -> None:
    # Load environment variables from .env file
    load_dotenv()

    base_url = os.getenv("PAYPAL_BASE_URL", "https://api-m.sandbox.paypal.com")
    client_id = os.getenv("PAYPAL_CLIENT_ID")
    client_secret = os.getenv("PAYPAL_CLIENT_SECRET")

    if not client_id or not client_secret or client_id == "your_client_id_here" or client_secret == "your_client_secret_here":
        print("ERROR: PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set.")
        print("Please update the .env file in the project root with your actual PayPal sandbox credentials.")
        print("Get credentials from: https://developer.paypal.com/dashboard/")
        sys.exit(1)

    print(f"Using base URL: {base_url}")

    print("Obtaining OAuth2 access token...")
    access_token = get_access_token(base_url, client_id, client_secret)
    print("Access token acquired.")

    client = PayPalInvoicesClient(access_token=access_token, base_url=base_url)

    try:
        print("Creating draft invoice...")
        invoice_payload = build_minimal_invoice()
        invoice = client.create_invoice(invoice_payload)

        # PayPal may return a link response with href containing the invoice ID
        if "href" in invoice and "/invoicing/invoices/" in invoice["href"]:
            # Extract invoice ID from href URL
            href = invoice["href"]
            invoice_id = href.split("/invoicing/invoices/")[-1].split("?")[0]
            print(f"Created invoice: id={invoice_id}")
        else:
            # Standard response with id and status
            invoice_id = invoice.get("id")
            status = invoice.get("status")
            print(f"Created invoice: id={invoice_id}, status={status}")

        if not invoice_id:
            print(f"ERROR: Could not extract invoice ID from response: {invoice}")
            sys.exit(1)

        print("Sending invoice...")
        send_result = client.send_invoice(invoice_id, subject="Your test invoice", note="Thank you!", send_to_recipient=True)
        # Some responses may not include status immediately; fetch from result if present
        sent_status = send_result.get("status") or "SENT (operation acknowledged)"
        print(f"Send result status: {sent_status}")

        print("Cancelling invoice (demo)...")
        cancel_result = client.cancel_invoice(invoice_id, subject="Cancelling test invoice", note="Demo cancellation.")
        cancel_status = cancel_result.get("status") or "CANCELLED (operation acknowledged)"
        print(f"Cancel result status: {cancel_status}")

        print("Done.")

    except RateLimitError as e:
        print("Rate limit encountered and retries exhausted:")
        print(f"  status: {e.status_code}")
        print(f"  name: {e.error}")
        print(f"  message: {e.message}")
        if e.details:
            print(f"  details: {e.details}")
        sys.exit(2)
    except PayPalAPIError as e:
        print("PayPal API error:")
        print(f"  status: {e.status_code}")
        print(f"  name: {e.error}")
        print(f"  message: {e.message}")
        if e.details:
            print(f"  details: {e.details}")
        # Optionally show body for debugging
        if e.body:
            print(f"  body: {e.body}")
        sys.exit(3)


if __name__ == "__main__":
    main()
