# Contributing to Agent Registry

Thank you for your interest in contributing to Agent Registry! We welcome contributions from the community and appreciate your help in making this project better.

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- pnpm (recommended) or npm
- Git
- Basic understanding of TypeScript and Express.js

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/agent-registry.git
   cd agent-registry
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start Development Server**
   ```bash
   pnpm run dev
   ```

## 📋 How to Contribute

### 🐛 Reporting Bugs

1. Check if the issue already exists in [Issues](https://github.com/your-username/agent-registry/issues)
2. Create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)
   - Screenshots if applicable

### ✨ Suggesting Features

1. Check existing [Discussions](https://github.com/your-username/agent-registry/discussions) for similar ideas
2. Create a new discussion with:
   - Clear feature description
   - Use cases and benefits
   - Implementation ideas (optional)

### 🔧 Code Contributions

1. **Choose an Issue**
   - Look for issues labeled `good first issue` or `help wanted`
   - Comment on the issue to let others know you're working on it

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

3. **Make Changes**
   - Write clean, readable code
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation if needed

4. **Test Your Changes**
   ```bash
   # Run tests
   pnpm test
   
   # Run linting
   pnpm lint
   
   # Test the API
   pnpm run dev
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

6. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a Pull Request on GitHub.

## 📝 Code Style Guidelines

### TypeScript
- Use TypeScript for all new code
- Add proper type annotations
- Use interfaces for object shapes
- Prefer `const` over `let` when possible

### Naming Conventions
- Use camelCase for variables and functions
- Use PascalCase for classes and interfaces
- Use UPPER_SNAKE_CASE for constants
- Use kebab-case for file names

### Code Structure
- Keep functions small and focused
- Use meaningful variable names
- Add JSDoc comments for public functions
- Group related functionality together

### Example Code Style
```typescript
/**
 * Registers a new agent in the blockchain registry
 * @param agentData - The agent data to register
 * @returns Promise<RegistrationResult>
 */
export async function registerAgent(agentData: AgentData): Promise<RegistrationResult> {
  try {
    // Implementation here
    return { success: true, agentId: 'did:example:123' };
  } catch (error) {
    throw new Error(`Failed to register agent: ${error.message}`);
  }
}
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Writing Tests
- Write tests for all new functionality
- Aim for high test coverage
- Use descriptive test names
- Test both success and error cases

### Example Test
```typescript
describe('registerAgent', () => {
  it('should register a valid agent successfully', async () => {
    const agentData = {
      type: 'agent',
      name: 'Test Agent',
      capabilities: ['web_search']
    };
    
    const result = await registerAgent(agentData);
    
    expect(result.success).toBe(true);
    expect(result.agentId).toMatch(/^did:/);
  });
  
  it('should throw error for invalid agent data', async () => {
    const invalidData = { type: 'invalid' };
    
    await expect(registerAgent(invalidData))
      .rejects
      .toThrow('Invalid agent data');
  });
});
```

## 📚 Documentation

### Code Documentation
- Add JSDoc comments for all public functions
- Document complex algorithms or business logic
- Include examples in comments when helpful

### README Updates
- Update README.md for new features
- Add usage examples
- Update installation instructions if needed

### API Documentation
- Update API documentation for new endpoints
- Include request/response examples
- Document error codes and messages

## 🔄 Pull Request Process

### Before Submitting
- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No console.log statements left
- [ ] No sensitive data in code

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] New tests added for new functionality
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
```

### Review Process
1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, your PR will be merged
4. Thank you for contributing! 🎉

## 🏷️ Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements to documentation
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `question` - Further information is requested

## 💬 Communication

- Use GitHub Issues for bug reports and feature requests
- Use GitHub Discussions for questions and general discussion
- Be respectful and constructive in all interactions
- Follow our [Code of Conduct](./CODE_OF_CONDUCT.md)

## 🎯 Development Roadmap

### Current Priorities
- [ ] Add comprehensive test suite
- [ ] Improve error handling
- [ ] Add rate limiting
- [ ] Create Docker setup
- [ ] Add monitoring and metrics

### Future Features
- [ ] Multi-chain support
- [ ] Agent verification system
- [ ] Advanced search capabilities
- [ ] Web dashboard
- [ ] SDK for other languages

## 🆘 Need Help?

- Check existing [Issues](https://github.com/your-username/agent-registry/issues)
- Join our [Discussions](https://github.com/your-username/agent-registry/discussions)
- Read the [Documentation](./docs/)

---

Thank you for contributing to Agent Registry! 🙏
