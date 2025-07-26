import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SocialFeed } from '../SocialFeed';

// Mock the apiFetch function
jest.mock('../../lib/api', () => ({
  apiFetch: jest.fn(),
}));

const mockApiFetch = require('../../lib/api').apiFetch;

describe('SocialFeed', () => {
  const mockPosts = [
    {
      postId: '1',
      content: 'Test post content',
      type: 'issue',
      category: 'infrastructure',
      upvotes: 5,
      downvotes: 1,
      commentCount: 3,
      createdAt: '2023-01-01T00:00:00Z',
      author: {
        userId: 'user1',
        username: 'Test User',
        profileImageUrl: null
      },
      neighborhood: 'Test Neighborhood',
      location: {
        latitude: 28.6139,
        longitude: 77.2090
      }
    },
  ];

  beforeEach(() => {
    mockApiFetch.mockClear();
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPosts),
    });
  });

  it('renders feed header', async () => {
    render(<SocialFeed />);
    
    await waitFor(() => {
      expect(screen.getByText('Community Feed')).toBeInTheDocument();
      expect(screen.getByText('Stay updated with what\'s happening in your neighborhood')).toBeInTheDocument();
    });
  });

  it('renders posts from API', async () => {
    render(<SocialFeed />);
    
    await waitFor(() => {
      expect(screen.getByText('Test post content')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('issue')).toBeInTheDocument();
    });
  });

  it('handles upvote click', async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPosts),
    }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<SocialFeed />);
    
    await waitFor(() => {
      expect(screen.getByText('Test post content')).toBeInTheDocument();
    });

    const upvoteButton = screen.getByText('5');
    fireEvent.click(upvoteButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://0.0.0.0:8000/api/v1/posts/1/upvote',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  it('expands comments when comment button is clicked', async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPosts),
    }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { content: 'Test comment' }
      ]),
    });

    render(<SocialFeed />);
    
    await waitFor(() => {
      expect(screen.getByText('Test post content')).toBeInTheDocument();
    });

    const commentButton = screen.getByText('2');
    fireEvent.click(commentButton);

    await waitFor(() => {
      expect(screen.getByText('Comments')).toBeInTheDocument();
      expect(screen.getByText('Test comment')).toBeInTheDocument();
    });
  });

  it('submits comment successfully', async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPosts),
    }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<SocialFeed />);
    
    await waitFor(() => {
      expect(screen.getByText('Test post content')).toBeInTheDocument();
    });

    const commentButton = screen.getByText('2');
    fireEvent.click(commentButton);

    await waitFor(() => {
      expect(screen.getByText('Comments')).toBeInTheDocument();
    });

    const commentInput = screen.getByPlaceholderText('Add a comment...');
    const submitButton = screen.getByText('Post');

    await userEvent.type(commentInput, 'New comment');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        'http://0.0.0.0:8000/api/v1/posts/1/comments',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'New comment' }),
        })
      );
    });
  });

  it('shows vulgarity warning for inappropriate comments', async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPosts),
    }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    }).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        detail: {
          code: 'VULGAR_CONTENT_DETECTED',
          message: 'Vulgar content detected.',
        },
      }),
    });

    render(<SocialFeed />);
    
    await waitFor(() => {
      expect(screen.getByText('Test post content')).toBeInTheDocument();
    });

    const commentButton = screen.getByText('2');
    fireEvent.click(commentButton);

    await waitFor(() => {
      expect(screen.getByText('Comments')).toBeInTheDocument();
    });

    const commentInput = screen.getByPlaceholderText('Add a comment...');
    const submitButton = screen.getByText('Post');

    await userEvent.type(commentInput, 'Inappropriate content');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Vulgar content detected.')).toBeInTheDocument();
    });
  });
}); 