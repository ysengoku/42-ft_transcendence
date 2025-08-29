import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AvatarUploadModal } from '@components/pages/settings/components/AvatarUploadModal';

// Mock environment and APIs
beforeEach(() => {
  // Mock URL.createObjectURL and revokeObjectURL
  global.URL.createObjectURL = vi.fn((file) => `blob://mock-${file.name}`);
  global.URL.revokeObjectURL = vi.fn();
  
  // Mock Image constructor for content validation
  global.Image = vi.fn(() => {
    const img = {
      src: '',
      onload: null,
      onerror: null,
    };
    
    // Simulate successful image loading for valid images
    setTimeout(() => {
      if (img.onload && img.src.includes('blob://mock-')) {
        img.onload();
      }
    }, 0);
    
    return img;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('AvatarUploadModal component', () => {
  it('should render modal structure on connectedCallback', () => {
    const modal = new AvatarUploadModal();
    document.body.appendChild(modal);
    modal.connectedCallback();

    const input = modal.querySelector('#avatar-upload-input');
    const preview = modal.querySelector('#avatar-upload-preview');
    const feedback = modal.querySelector('#avatar-feedback');

    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(preview).toBeInstanceOf(HTMLImageElement);
    expect(feedback).toBeInstanceOf(HTMLDivElement);
  });

  it('should preview valid image file and set selectedFile', async () => {
    const modal = new AvatarUploadModal();
    document.body.appendChild(modal);
    modal.connectedCallback();

    const file = new File([''], 'avatar.png', { type: 'image/png', size: 1024 });
    const input = modal.avatarUploadField;
    const preview = modal.avatarPreview;

    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: { files: [file] } });

    await modal.readURL(event);

    expect(modal.selectedFile).toBe(file);
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(preview.src).toContain('blob://mock-avatar.png');
    expect(input.classList.contains('is-invalid')).toBe(false);
  });

  it('should reject non-image files', async () => {
    const modal = new AvatarUploadModal();
    document.body.appendChild(modal);
    modal.connectedCallback();
    const file = new File([''], 'evil.js', { type: 'application/javascript', size: 10 });
    const input = modal.avatarUploadField;
    const feedback = modal.querySelector('#avatar-feedback');

    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: { files: [file] } });

    await modal.readURL(event);

    expect(modal.selectedFile).toBeNull();
    expect(input.classList.contains('is-invalid')).toBe(true);
    expect(feedback.textContent).toBe('Please select a valid image file.');
  });

  it('should reject oversized image files', async () => {
    const modal = new AvatarUploadModal();
    document.body.appendChild(modal);
    modal.connectedCallback();

    const bigFile = new File(['a'.repeat(6 * 1024 * 1024)], 'avatar.png', {
      type: 'image/png',
    });
    const input = modal.avatarUploadField;
    const feedback = modal.querySelector('#avatar-feedback');

    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: { files: [bigFile] } });

    await modal.readURL(event);

    expect(modal.selectedFile).toBeNull();
    expect(input.classList.contains('is-invalid')).toBe(true);
    expect(feedback.textContent).toContain('is too large');
  });

  it('should revoke blob URL on modal hide', async () => {
    const modal = new AvatarUploadModal();
    document.body.appendChild(modal);
    modal.connectedCallback();

    const file = new File([''], 'avatar.png', { type: 'image/png', size: 1024 });
    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: { files: [file] } });
    
    // First call readURL to set up the blob URL and event listener
    await modal.readURL(event);

    const hideEvent = new Event('hide.bs.modal');
    modal.modalElement.dispatchEvent(hideEvent);

    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('should validate image content successfully for valid images', async () => {
    const modal = new AvatarUploadModal();
    const file = new File([''], 'avatar.png', { type: 'image/png', size: 1024 });

    const result = await modal.validateImageContent(file);

    expect(result.safe).toBe(true);
    expect(result.message).toBeUndefined();
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('should reject invalid image content', async () => {
    const modal = new AvatarUploadModal();
    const file = new File([''], 'fake.png', { type: 'image/png', size: 1024 });

    // Mock Image to simulate loading error for this test
    const mockImageError = vi.fn(() => {
      const img = {
        src: '',
        onload: null,
        onerror: null,
      };
      
      setTimeout(() => {
        if (img.onerror) {
          img.onerror();
        }
      }, 0);
      
      return img;
    });
    
    global.Image = mockImageError;

    const result = await modal.validateImageContent(file);

    expect(result.safe).toBe(false);
    expect(result.message).toBe('Please select a valid image file.');
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});
