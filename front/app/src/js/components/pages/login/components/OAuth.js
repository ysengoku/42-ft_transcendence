import { API_ENDPOINTS } from '@api';
import { showErrorMessage } from '@utils';

export class OAuth extends HTMLElement {
    constructor() {
        super();
        this.handleOAuthClick = this.handleOAuthClick.bind(this);
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const btn42 = this.querySelector('.btn-42');
        const btnGithub = this.querySelector('.btn-github');
        
        if (btn42) btn42.addEventListener('click', () => this.handleOAuthClick('42'));
        if (btnGithub) btnGithub.addEventListener('click', () => this.handleOAuthClick('github'));
    }

    async handleOAuthClick(platform) {
        try {
            const response = await fetch(API_ENDPOINTS.OAUTH_AUTHORIZE(platform));

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('oauth_platform', platform);
                location.href = data.auth_url;
                return { success: true, status: 'redirecting' };
            } else {
                console.error('OAuth initialization failed:', response.statusText);
                showErrorMessage(`Failed to initialize OAuth process (Status: ${response.status})`);
                return { success: false, status: response.status };
            }
        } catch (error) {
            console.error('OAuth initialization failed:', error);
            showErrorMessage('An unexpected error occurred.');
            return { success: false, status: 'network_error' };
        }
    }

    render() {
        this.innerHTML = `
            <style>
                .btn-github {
                    background-color: #171717;
                    color: #ffffff;
                    border-color: #171717;
                    transition: all 0.3s ease;
                    font-size: 1rem;
                }
                .btn-github:hover {
                    background-color: #424242;
                    color: #ffffff;
                    border-color: #424242;
                }
                .btn-42 {
                    background-color: #ffffff;
                    color: #000000;
                    border: 1px solid #dee2e6;
                    transition: all 0.3s ease;
                    font-size: 1rem;
                }
                .btn-42:hover {
                    background-color:rgb(160, 165, 171);
                    color: #000000;
                }
                .me-2 {
                    margin-right: 0.5rem;
                }
                .btn {
                    font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif;
                }
            </style>
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-12">
                        <div class="d-grid gap-3">
                            <button class="btn btn-lg btn-42">
                                <svg xmlns:dc="http://purl.org/dc/elements/1.1/"
                                     xmlns:cc="http://creativecommons.org/ns#"
                                     xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                                     xmlns:svg="http://www.w3.org/2000/svg"
                                     xmlns="http://www.w3.org/2000/svg"
                                     xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
                                     xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
                                     version="1.1" id="Calque_1" x="0px" y="0px"
                                     viewBox="0 0 137.6 96.599998"
                                     enable-background="new 0 0 595.3 841.9"
                                     xml:space="preserve" inkscape:version="0.48.2 r9819"
                                     width="24" height="24" sodipodi:docname="42_logo.svg"
                                     class="me-2">
                                    <g id="g3" transform="translate(-229.2,-372.70002)">
                                        <polygon points="229.2,443.9 279.9,443.9 279.9,469.3 305.2,469.3 305.2,423.4 254.6,423.4 305.2,372.7 279.9,372.7 229.2,423.4"/>
                                        <polygon points="316.1,398.1 341.4,372.7 316.1,372.7"/>
                                        <polygon points="341.4,398.1 316.1,423.4 316.1,448.7 341.4,448.7 341.4,423.4 366.8,398.1 366.8,372.7 341.4,372.7"/>
                                        <polygon points="366.8,423.4 341.4,448.7 366.8,448.7"/>
                                    </g>
                                </svg>
                                Sign in with 42 Intra
                            </button>
                            <button class="btn btn-lg btn-github">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-github me-2" viewBox="0 0 16 16">
                                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                                </svg>
                                Sign in with GitHub
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('oauth-component', OAuth);