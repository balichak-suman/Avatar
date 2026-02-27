#!/usr/bin/env python3
import asyncio
import httpx

async def test_brevo_email():
    import os
    api_key = os.getenv("BREVO_API_KEY")
    url = "https://api.brevo.com/v3/smtp/email"
    to_email = "balichaksumann@gmail.com"
    otp_code = "999999"
    
    headers = {
        "api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    data = {
        "sender": {"email": "balichaksumann@gmail.com", "name": "Cosmic Oracle"},
        "to": [{"email": to_email}],
        "subject": "TEST: COMMANDER ACCESS CODE (OTP)",
        "textContent": f"COMMANDER,\n\nThis is a TEST of the Brevo integration. Your secure uplink code is: {otp_code}\n\n- Mission Control"
    }
    
    print(f"Testing Brevo delivery to {to_email}...")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, headers=headers, json=data, timeout=10.0)
            if resp.status_code in [200, 201, 202]:
                print(f"✅ SUCCESS: Email sent! (Status: {resp.status_code})")
                print(f"Response: {resp.text}")
            else:
                print(f"❌ FAILED: Brevo Error {resp.status_code}")
                print(f"Error Details: {resp.text}")
        except Exception as e:
            print(f"❌ CRITICAL ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test_brevo_email())
