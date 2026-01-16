# Contributing to AIBrain

Thank you for your interest in contributing to AIBrain! We welcome contributions from everyone and are grateful for every pull request, bug report, and feature suggestion.

## Code of Conduct

By participating in this project, you agree to maintain a respectful, harassment-free environment for everyone. Be kind, constructive, and professional in all interactions.

## How Can I Contribute?

### Reporting Bugs

Before submitting a bug report:
1. Check the [existing issues](https://github.com/Kartikgc9/AIBrain/issues) to avoid duplicates
2. Collect relevant information (browser version, extension version, error messages, etc.)
3. Try to create a minimal reproduction case

When submitting a bug report, include:
- **Description**: Clear and concise description of the bug
- **Steps to Reproduce**: Detailed steps to reproduce the behavior
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happened
- **Screenshots**: If applicable
- **Environment**:
  - Browser version
  - Operating system
  - Extension version
  - AI platform where the issue occurred

### Suggesting Features

We love feature suggestions! Before submitting:
1. Check if the feature has already been suggested
2. Consider if it aligns with the project's privacy-first philosophy
3. Think about how it would benefit other users

When suggesting a feature, include:
- **Use Case**: Why you need this feature
- **Proposed Solution**: How you envision it working
- **Alternatives**: Other approaches you've considered
- **Privacy Impact**: How it affects user privacy

### Adding Support for New AI Platforms

To add support for a new AI chat platform:

1. **Research the platform**:
   - Identify conversation container selectors
   - Understand the DOM structure
   - Test on different conversation types

2. **Update content script** (`memory-layer/extension/src/content-scripts/universalContent.ts`):
   ```typescript
   // Add platform detection
   function detectPlatform(): string {
     if (window.location.hostname.includes('newplatform.com')) return 'newplatform';
     // ...
   }

   // Add selectors
   const SELECTORS: Record<string, PlatformSelectors> = {
     newplatform: {
       conversationContainer: '.chat-container',
       messageSelector: '.message',
       userMessageClass: 'user-message',
       assistantMessageClass: 'ai-message',
       buttonInsertionPoint: '.header',
     },
     // ...
   };
   ```

3. **Update manifest** (`memory-layer/extension/src/manifest.json`):
   ```json
   "host_permissions": [
     "https://newplatform.com/*"
   ]
   ```

4. **Test thoroughly**:
   - Verify button injection works
   - Test conversation extraction
   - Check keyboard shortcut functionality
   - Test with different conversation lengths

5. **Update documentation**:
   - Add platform to README.md
   - Document any platform-specific quirks

### Contributing Code

#### Setting Up Development Environment

1. **Fork and clone**:
   ```bash
   git clone https://github.com/Kartikgc9/AIBrain.git
   cd AIBrain
   ```

2. **Install dependencies**:
   ```bash
   # Memory engine
   cd memory-layer/memory-engine
   npm install

   # Extension
   cd ../extension
   npm install
   ```

3. **Build the project**:
   ```bash
   # Memory engine
   cd memory-layer/memory-engine
   npm run build

   # Extension
   cd ../extension
   npm run build
   ```

4. **Run tests**:
   ```bash
   cd memory-layer/memory-engine
   npm test
   ```

#### Development Workflow

1. **Create a branch**:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**:
   - Write clean, readable code
   - Follow existing code style and patterns
   - Add comments for complex logic
   - Update tests as needed

3. **Test your changes**:
   ```bash
   # Run unit tests
   cd memory-layer/memory-engine
   npm test

   # Manual testing
   # Load the extension in Chrome and test all affected features
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add support for new AI platform"
   # or
   git commit -m "fix: resolve memory duplication issue"
   ```

   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `test:` for test additions or fixes
   - `refactor:` for code refactoring
   - `chore:` for maintenance tasks

5. **Push and create a Pull Request**:
   ```bash
   git push origin feature/your-feature-name
   ```
   Then open a PR on GitHub with:
   - Clear description of changes
   - Link to related issues
   - Screenshots/videos if UI changes
   - Test results

#### Code Style Guidelines

**TypeScript**:
- Use TypeScript strict mode
- Define interfaces for all data structures
- Use meaningful variable and function names
- Prefer `const` over `let`
- Use async/await over promises

**React**:
- Use functional components with hooks
- Keep components small and focused
- Use TypeScript for props and state

**Testing**:
- Write unit tests for new features
- Maintain >80% code coverage
- Test edge cases and error conditions
- Use descriptive test names

**Comments**:
- Add comments for complex logic only
- Write self-documenting code
- Update comments when changing code

**Example**:
```typescript
// Good
async function extractMemories(text: string): Promise<Memory[]> {
  const response = await llm.complete({
    prompt: buildExtractionPrompt(text),
    model: 'gpt-4-turbo-preview',
  });
  return parseMemories(response);
}

// Bad
async function em(t: string): Promise<any> {
  let r = await llm.complete({ p: bep(t), m: 'gpt-4-turbo-preview' });
  return pm(r);
}
```

### Improving Documentation

Documentation improvements are always welcome!

**Areas to improve**:
- Fix typos and grammar
- Add code examples
- Clarify confusing sections
- Add diagrams or screenshots
- Translate to other languages
- Update outdated information

**Documentation files**:
- `README.md` - Main project overview
- `CONTRIBUTING.md` - This file
- `Docs/` - Detailed technical documentation
- Code comments - Inline documentation

## Project Architecture

### Key Concepts

**Memory Model**:
```typescript
interface Memory {
  id: string
  userId: string
  content: string
  type: "preference" | "fact" | "task" | "project" | "meta"
  scope: "user_global" | "session" | "site" | "conversation"
  source: MemorySource
  createdAt: number
  updatedAt: number
  confidence: number
  tags: string[]
  embedding: number[]
}
```

**Ingestion Pipeline**:
1. User captures conversation
2. Text is sent to ExtractionService
3. LLM extracts memories with structured output
4. IngestionPipeline checks for duplicates using similarity
5. Memories are added, updated, or deduplicated
6. Embeddings are generated and stored

**Storage Layer**:
- Abstract `MemoryStore` interface
- `LocalStore` for Node.js (file-based)
- `BrowserStore` for extension (IndexedDB)

### Where to Make Changes

**Adding a feature to the extension UI**:
- `memory-layer/extension/src/popup/App.tsx`
- `memory-layer/extension/src/popup/components/`

**Modifying memory extraction logic**:
- `memory-layer/memory-engine/src/ingestion/ExtractionService.ts`

**Changing storage behavior**:
- `memory-layer/memory-engine/src/store/`

**Adding a new LLM provider**:
- Create new class in `memory-layer/memory-engine/src/llm/`
- Implement `LLMProvider` interface

**Updating content scripts**:
- `memory-layer/extension/src/content-scripts/universalContent.ts`

## Testing Guidelines

### Unit Tests

Required for:
- Core memory logic
- Storage operations
- LLM interactions (with mocks)
- Utility functions

Example:
```typescript
describe('IngestionPipeline', () => {
  it('should deduplicate similar memories', async () => {
    const pipeline = new IngestionPipeline(mockStore, mockLLM);
    await pipeline.ingest('I like pizza');
    await pipeline.ingest('I love pizza'); // Similar, should deduplicate

    const memories = await mockStore.listMemories();
    expect(memories).toHaveLength(1);
  });
});
```

### Manual Testing Checklist

Before submitting a PR, test:

- [ ] Extension loads without errors
- [ ] 🧠 button appears on all supported platforms
- [ ] Ctrl+M shortcut works
- [ ] Conversation extraction is accurate
- [ ] Popup displays correct stats
- [ ] Recent memories show up
- [ ] Settings save correctly
- [ ] No console errors
- [ ] Memory deduplication works
- [ ] Cross-browser compatibility (if applicable)

## Pull Request Process

1. **Update documentation** if you've changed APIs or added features
2. **Add tests** for new functionality
3. **Ensure all tests pass** (`npm test`)
4. **Update the README** if you've added new platforms or features
5. **Follow the PR template**
6. **Wait for review** - maintainers will review within 7 days
7. **Address feedback** - make requested changes promptly
8. **Squash commits** if requested before merge

## Security Vulnerabilities

If you discover a security vulnerability:
1. **DO NOT** open a public issue
2. Email ykartikawadh@gmail.com with details
3. Wait for a response before disclosing publicly
4. We'll work with you to fix and credit you appropriately

## Questions?

- Open a [Discussion](https://github.com/Kartikgc9/AIBrain/discussions)
- Join our [Discord server](#) (if applicable)
- Email the maintainers at ykartikawadh@gmail.com

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in the extension's about page

## License

By contributing to AIBrain, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to AIBrain! 🧠
