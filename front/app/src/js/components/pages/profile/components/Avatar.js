export class ProfileAvatar extends HTMLElement {
  #state = {
    avatarUrl: '',
  };

  constructor() {
    super();
  }

  set avatarUrl(url) {
    this.#state.avatarUrl = url;
    this.render();
  }

  render() {
    this.innerHTML = this.template() + this.style();
  }

  template() {
    return `
    <div class="profile-avatar-container">
      <div class="profile-avatar-frame d-flex justify-content-center align-items-center p-2 w-100">
        <img src="${this.#state.avatarUrl}" alt="Avatar" class="rounded-circle">
      </div>
    </div>
    `;
  }

  style() {
    return `
    <style>
      .profile-avatar-container {
        width: 100%;  
        display: flex;
        justify-content: center;
        align-items: center;
        height: auto;
      }
      .profile-avatar-container img {
        width: 240px;
        aspect-ratio: 1;
        object-fit: cover;
        border-radius: 50%;
        background-color: grey;
        filter: sepia(30%) contrast(1.4) brightness(0.9) saturate(0.8) grayscale(5%);
      }
    </style>
    `;
  }
}

customElements.define('profile-avatar', ProfileAvatar);

// CSS image filter properties:
// sepia(xx%) - Applies a sepia effect to the image. 0% is no sepia, 100% is full sepia.
// contrast(xx) - Adjusts the contrast of the image. 1 is no contrast, 2 is double the contrast.
// brightness(xx) - Adjusts the brightness of the image. 1 is no brightness, 2 is double the brightness.
// saturate(xx) - Adjusts the saturation of the image. 0 is no saturation, 2 is double the saturation.
// grayscale(xx%) - Converts the image to grayscale. 0% is no grayscale, 100% is full grayscale.
