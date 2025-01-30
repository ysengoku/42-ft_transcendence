// twofa.js

import { router } from '@router';

export class TwoFactorAuth extends HTMLElement {
  constructor() {
    super();
  }

  async send2FACode() {
    try {
      const response = await fetch('/api/2fa/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: "fanny"
          //'Authorization': `Bearer ${localStorage.getItem('auth_token')}`, // when JWT is implemented
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        localStorage.setItem('2faCompleted', 'true'); // Temporary solution, goes with the one in Login.js
        router.navigate('/home');
        console.log('2FA code sent successfully');
      } else {
        console.error('Error sending 2FA code');
      }
    } catch (error) {
      console.error('Error in sending 2FA code', error);
      alert('Failed to send 2FA code');
    }
  }

  async verify2FACode(code) {
    try {
      const response = await fetch('/api/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        console.log('2FA verification successful');
        localStorage.setItem('isLoggedIn', 'true');
        router.navigate('/home');
      } else {
        console.error('Invalid 2FA code');
        alert('Invalid 2FA code');
      }
    } catch (error) {
      console.error('Error in 2FA verification', error);
      alert('Failed to verify 2FA code');
    }
  }

  connectedCallback() {
    this.render();

    // Attach event listeners for the form submission
    this.querySelector('#send-code-btn').addEventListener('click', () => {
      this.send2FACode();
    });

    this.querySelector('#verify-code-btn').addEventListener('click', () => {
      const code = this.querySelector('#2fa-code').value;
      this.verify2FACode(code);
    });
  }

  render() {
    this.innerHTML = `
      <div class="container">
        <h3>Two-Factor Authentication</h3>
        <p>Please enter the code sent to your phone/email.</p>

        <input type="text" id="2fa-code" placeholder="Enter 2FA code" />
        <button id="verify-code-btn">Verify Code</button>
        <br />
        <button id="send-code-btn">Send 2FA Code</button>
      </div>
    `;
  }
}

customElements.define('twofa-auth', TwoFactorAuth);
