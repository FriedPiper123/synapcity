import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreatePostPage from '../CreatePost';

// Mock the apiFetch function
jest.mock('../../lib/api', () => ({
  apiFetch: jest.fn(),
}));

const mockApiFetch = require('../../lib/api').apiFetch;

describe('CreatePostPage', () => {
  beforeEach(() => {
    mockApiFetch.mockClear();
  });

  it('renders create post form', () => {
    render(<CreatePostPage />);
    
    expect(screen.getByText('Create a Post')).toBeInTheDocument();
    expect(screen.getByLabelText('Content')).toBeInTheDocument();
    expect(screen.getByLabelText('Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Latitude')).toBeInTheDocument();
    expect(screen.getByLabelText('Longitude')).toBeInTheDocument();
    expect(screen.getByText('Create Post')).toBeInTheDocument();
  });

  it('submits form successfully', async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    render(<CreatePostPage />);
    
    const contentTextarea = screen.getByLabelText('Content');
    const latitudeInput = screen.getByLabelText('Latitude');
    const longitudeInput = screen.getByLabelText('Longitude');
    const submitButton = screen.getByText('Create Post');

    await userEvent.type(contentTextarea, 'Test post content');
    await userEvent.type(latitudeInput, '40.7128');
    await userEvent.type(longitudeInput, '-74.0060');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/v1/posts/',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'Test post content',
            type: 'issue',
            category: 'General',
            location: { latitude: 40.7128, longitude: -74.0060 },
            neighborhood: 'Web User',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Post created successfully!')).toBeInTheDocument();
    });
  });

  it('shows vulgarity warning for inappropriate content', async () => {
    mockApiFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({
        detail: {
          code: 'VULGAR_CONTENT_DETECTED',
          message: 'Vulgar content detected.',
        },
      }),
    });

    render(<CreatePostPage />);
    
    const contentTextarea = screen.getByLabelText('Content');
    const latitudeInput = screen.getByLabelText('Latitude');
    const longitudeInput = screen.getByLabelText('Longitude');
    const submitButton = screen.getByText('Create Post');

    await userEvent.type(contentTextarea, 'Inappropriate content');
    await userEvent.type(latitudeInput, '40.7128');
    await userEvent.type(longitudeInput, '-74.0060');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Vulgar content detected.')).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    mockApiFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<CreatePostPage />);
    
    const contentTextarea = screen.getByLabelText('Content');
    const latitudeInput = screen.getByLabelText('Latitude');
    const longitudeInput = screen.getByLabelText('Longitude');
    const submitButton = screen.getByText('Create Post');

    await userEvent.type(contentTextarea, 'Test content');
    await userEvent.type(latitudeInput, '40.7128');
    await userEvent.type(longitudeInput, '-74.0060');
    fireEvent.click(submitButton);

    expect(screen.getByText('Posting...')).toBeInTheDocument();
  });

  it('shows error message on API failure', async () => {
    mockApiFetch.mockRejectedValue(new Error('Network error'));

    render(<CreatePostPage />);
    
    const contentTextarea = screen.getByLabelText('Content');
    const latitudeInput = screen.getByLabelText('Latitude');
    const longitudeInput = screen.getByLabelText('Longitude');
    const submitButton = screen.getByText('Create Post');

    await userEvent.type(contentTextarea, 'Test content');
    await userEvent.type(latitudeInput, '40.7128');
    await userEvent.type(longitudeInput, '-74.0060');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('validates required fields', async () => {
    render(<CreatePostPage />);
    
    const submitButton = screen.getByText('Create Post');
    fireEvent.click(submitButton);

    // Form should not submit without required fields
    expect(mockApiFetch).not.toHaveBeenCalled();
  });
}); 