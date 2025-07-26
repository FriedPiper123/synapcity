describe('Main User Flow', () => {
  beforeEach(() => {
    // Mock API responses
    cy.intercept('GET', 'http://0.0.0.0:8000/api/v1/posts/*', {
      statusCode: 200,
      body: [
        {
          postId: '1',
          content: 'Test post for E2E testing',
          authorName: 'Test User',
          type: 'issue',
          upvotes: 5,
          commentCount: 2,
          createdAt: '2024-01-01T00:00:00Z',
          neighborhood: 'Test Area',
        },
      ],
    }).as('getPosts');

    cy.intercept('POST', 'http://0.0.0.0:8000/api/v1/posts/*/upvote', {
      statusCode: 200,
      body: {},
    }).as('upvotePost');

    cy.intercept('GET', 'http://0.0.0.0:8000/api/v1/posts/*/comments*', {
      statusCode: 200,
      body: [
        { content: 'Test comment 1' },
        { content: 'Test comment 2' },
      ],
    }).as('getComments');

    cy.intercept('POST', 'http://0.0.0.0:8000/api/v1/posts/*/comments', {
      statusCode: 200,
      body: {},
    }).as('postComment');

    cy.intercept('POST', 'http://0.0.0.0:8000/api/v1/posts/', {
      statusCode: 200,
      body: { postId: 'new-post' },
    }).as('createPost');

    cy.intercept('GET', 'http://0.0.0.0:8000/api/v1/insights/area-analysis-response', {
      statusCode: 200,
      body: {
        analysis: {
          overallScore: 85,
          categoryScores: {
            infrastructure: 80,
            safety: 90,
          },
        },
      },
    }).as('getInsights');
  });

  it('should navigate through all main features', () => {
    cy.visit('/');
    cy.login();

    // Test sidebar navigation
    cy.get('aside').should('be.visible');
    cy.contains('Dashboard').should('be.visible');
    cy.contains('Community Feed').should('be.visible');
    cy.contains('Map').should('be.visible');
    cy.contains('Insights').should('be.visible');
    cy.contains('Create Post').should('be.visible');

    // Test feed functionality
    cy.contains('Community Feed').click();
    cy.wait('@getPosts');
    cy.contains('Test post for E2E testing').should('be.visible');
    cy.contains('Test User').should('be.visible');

    // Test upvote functionality
    cy.contains('5').click();
    cy.wait('@upvotePost');

    // Test comment functionality
    cy.contains('2').click(); // Click comment button
    cy.wait('@getComments');
    cy.contains('Test comment 1').should('be.visible');
    cy.contains('Test comment 2').should('be.visible');

    // Test adding a comment
    cy.get('input[placeholder="Add a comment..."]').type('New test comment');
    cy.contains('Post').click();
    cy.wait('@postComment');

    // Test post creation
    cy.contains('Create Post').click();
    cy.url().should('include', '/create');
    cy.get('textarea').type('E2E test post content');
    cy.get('select').first().select('suggestion');
    cy.get('select').eq(1).select('Safety');
    cy.get('input[type="number"]').first().type('40.7128');
    cy.get('input[type="number"]').eq(1).type('-74.0060');
    cy.get('button[type="submit"]').click();
    cy.wait('@createPost');
    cy.contains('Post created successfully!').should('be.visible');

    // Test map page
    cy.contains('Map').click();
    cy.url().should('include', '/map');
    cy.contains('City Map').should('be.visible');

    // Test insights page
    cy.contains('Insights').click();
    cy.url().should('include', '/insights');
    cy.wait('@getInsights');
    cy.contains('Area Insights').should('be.visible');
  });

  it('should handle vulgarity warnings', () => {
    cy.intercept('POST', 'http://0.0.0.0:8000/api/v1/posts/', {
      statusCode: 400,
      body: {
        detail: {
          code: 'VULGAR_CONTENT_DETECTED',
          message: 'Vulgar content detected.',
        },
      },
    }).as('createPostVulgar');

    cy.visit('/create');
    cy.login();

    cy.get('textarea').type('Inappropriate content');
    cy.get('input[type="number"]').first().type('40.7128');
    cy.get('input[type="number"]').eq(1).type('-74.0060');
    cy.get('button[type="submit"]').click();
    cy.wait('@createPostVulgar');
    cy.contains('Vulgar content detected.').should('be.visible');
  });

  it('should handle comment vulgarity warnings', () => {
    cy.intercept('POST', 'http://0.0.0.0:8000/api/v1/posts/*/comments', {
      statusCode: 400,
      body: {
        detail: {
          code: 'VULGAR_CONTENT_DETECTED',
          message: 'Vulgar comment detected.',
        },
      },
    }).as('postCommentVulgar');

    cy.visit('/');
    cy.login();
    cy.wait('@getPosts');

    cy.contains('2').click(); // Click comment button
    cy.wait('@getComments');

    cy.get('input[placeholder="Add a comment..."]').type('Inappropriate comment');
    cy.contains('Post').click();
    cy.wait('@postCommentVulgar');
    cy.contains('Vulgar comment detected.').should('be.visible');
  });

  it('should handle API errors gracefully', () => {
    cy.intercept('GET', 'http://0.0.0.0:8000/api/v1/posts/*', {
      statusCode: 500,
      body: { error: 'Internal server error' },
    }).as('getPostsError');

    cy.visit('/');
    cy.login();
    cy.wait('@getPostsError');

    // Should show loading state and handle error gracefully
    cy.contains('Loading feed...').should('be.visible');
  });
}); 